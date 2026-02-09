import { NextRequest } from "next/server";
import {
  extractTranslatables,
  deduplicateItems,
  applyTranslations,
  type TranslatableField,
} from "@/lib/cloudcart-parser";
import { translateTexts } from "@/lib/translator";
import { getIndustry } from "@/lib/industries";

export const maxDuration = 300; // 5 min timeout for large feeds

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const industryId = formData.get("industry") as string;
        const sourceLang = formData.get("sourceLang") as string;
        const targetLang = formData.get("targetLang") as string;
        const apiKey = formData.get("apiKey") as string;
        const customContext = formData.get("customContext") as string | null;
        const fieldsJson = formData.get("fields") as string | null;

        if (!file || !industryId || !sourceLang || !targetLang || !apiKey) {
          sendEvent({
            type: "error",
            message: "Missing required fields",
          });
          controller.close();
          return;
        }

        const industry = getIndustry(industryId);
        if (!industry) {
          sendEvent({ type: "error", message: "Unknown industry" });
          controller.close();
          return;
        }

        // Apply custom context if provided
        if (customContext && industryId === "custom") {
          industry.context = customContext;
        }

        sendEvent({ type: "status", message: "Reading XML feed..." });

        const xmlContent = await file.text();

        sendEvent({
          type: "status",
          message: "Parsing feed structure...",
        });

        // Parse selected fields
        const selectedFields = fieldsJson
          ? new Set(JSON.parse(fieldsJson) as TranslatableField[])
          : undefined;

        // Extract translatable items
        const items = extractTranslatables(xmlContent, sourceLang, selectedFields);

        if (items.length === 0) {
          sendEvent({
            type: "error",
            message:
              "No translatable content found. The feed may already be translated or the source language is incorrect.",
          });
          controller.close();
          return;
        }

        // Deduplicate
        const unique = deduplicateItems(items);

        sendEvent({
          type: "stats",
          totalProducts: new Set(items.map((i) => i.productId)).size,
          totalItems: items.length,
          uniqueItems: unique.length,
        });

        sendEvent({
          type: "status",
          message: `Found ${unique.length} unique texts to translate (${items.length} total occurrences across ${new Set(items.map((i) => i.productId)).size} products)...`,
        });

        // Translate
        const translations = await translateTexts(
          unique,
          sourceLang,
          targetLang,
          industry,
          apiKey,
          (completed, total) => {
            sendEvent({
              type: "progress",
              completed,
              total,
              percent: Math.round((completed / total) * 100),
            });
          }
        );

        sendEvent({
          type: "status",
          message: "Applying translations to feed...",
        });

        // Apply translations to XML
        const translatedXml = applyTranslations(xmlContent, translations);

        sendEvent({
          type: "complete",
          translatedXml,
          translationCount: translations.size,
          message: `Successfully translated ${translations.size} unique texts.`,
        });
      } catch (err) {
        sendEvent({
          type: "error",
          message: `Translation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
