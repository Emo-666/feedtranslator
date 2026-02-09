import Anthropic from "@anthropic-ai/sdk";
import type { IndustryConfig } from "./industries";

const BATCH_SIZE = 40; // number of texts per API call
const MAX_RETRIES = 3;

interface TranslationBatch {
  texts: string[];
  fields: string[][]; // field types for each text
}

/**
 * Translates an array of text items using Claude API with industry context.
 * Returns a Map of original -> translated text.
 */
export async function translateTexts(
  texts: { text: string; fields: string[] }[],
  sourceLang: string,
  targetLang: string,
  industry: IndustryConfig,
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const client = new Anthropic({ apiKey });
  const translations = new Map<string, string>();

  // First, apply glossary matches directly
  for (const item of texts) {
    const glossaryMatch = industry.glossary[item.text];
    if (glossaryMatch) {
      translations.set(item.text, glossaryMatch);
    }
  }

  // Filter out glossary-matched items
  const remaining = texts.filter((t) => !translations.has(t.text));

  if (remaining.length === 0) {
    onProgress?.(texts.length, texts.length);
    return translations;
  }

  // Batch remaining items
  const batches: TranslationBatch[] = [];
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    batches.push({
      texts: remaining.slice(i, i + BATCH_SIZE).map((t) => t.text),
      fields: remaining.slice(i, i + BATCH_SIZE).map((t) => t.fields),
    });
  }

  let completed = texts.length - remaining.length;
  onProgress?.(completed, texts.length);

  // Process batches
  for (const batch of batches) {
    const batchTranslations = await translateBatch(
      client,
      batch,
      sourceLang,
      targetLang,
      industry
    );

    for (const [original, translated] of batchTranslations) {
      translations.set(original, translated);
    }

    completed += batch.texts.length;
    onProgress?.(completed, texts.length);
  }

  return translations;
}

async function translateBatch(
  client: Anthropic,
  batch: TranslationBatch,
  sourceLang: string,
  targetLang: string,
  industry: IndustryConfig
): Promise<Map<string, string>> {
  const glossaryContext =
    Object.entries(industry.glossary).length > 0
      ? `\n\nKnown terminology (always use these exact translations when these terms appear):\n${Object.entries(
          industry.glossary
        )
          .map(([k, v]) => `"${k}" → "${v}"`)
          .join("\n")}`
      : "";

  const numberedTexts = batch.texts
    .map((text, i) => {
      const fieldInfo = batch.fields[i].join(", ");
      // Truncate very long texts for the prompt but keep full text for matching
      const displayText = text.length > 500 ? text.substring(0, 500) + "..." : text;
      return `[${i + 1}] (${fieldInfo}) ${displayText}`;
    })
    .join("\n\n");

  const systemPrompt = `${industry.context}

You are translating product feed content from ${getLanguageName(sourceLang)} to ${getLanguageName(targetLang)}.
${glossaryContext}

CRITICAL RULES:
1. Translate ONLY the text content. Do NOT modify any XML/HTML tags, attributes, or structure.
2. Preserve all HTML entities (e.g. &lt; &gt; &amp; &quot;) exactly as they are.
3. Keep product names, brand names, collection names, and reference numbers untranslated.
4. Keep measurements and numbers as-is.
5. For tab descriptions containing HTML-encoded tables, translate only the visible text content within the table cells.
6. Use professional, industry-appropriate terminology - never literal translations.
7. Respond with ONLY the JSON array, no markdown formatting or explanation.`;

  const userPrompt = `Translate the following ${batch.texts.length} texts. Each is numbered and shows its field type in parentheses.

Return a JSON array with exactly ${batch.texts.length} strings, where index 0 is the translation of text [1], index 1 is the translation of text [2], etc.

${numberedTexts}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");

      // Parse the JSON response - strip markdown code fences if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/^```(?:json)?\s*\n?/, "")
          .replace(/\n?\s*```$/, "");
      }

      const translated: string[] = JSON.parse(jsonText);

      if (translated.length !== batch.texts.length) {
        throw new Error(
          `Expected ${batch.texts.length} translations, got ${translated.length}`
        );
      }

      const result = new Map<string, string>();
      for (let i = 0; i < batch.texts.length; i++) {
        result.set(batch.texts[i], translated[i]);
      }
      return result;
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Translation failed after retries");
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    bg: "Bulgarian",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    pl: "Polish",
    cs: "Czech",
    sk: "Slovak",
    ro: "Romanian",
    hu: "Hungarian",
    el: "Greek",
    tr: "Turkish",
    ru: "Russian",
    uk: "Ukrainian",
    sr: "Serbian",
    hr: "Croatian",
    sl: "Slovenian",
    mk: "Macedonian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    he: "Hebrew",
  };
  return names[code] || code;
}
