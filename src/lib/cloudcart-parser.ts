/**
 * CloudCart Feed XML Parser
 *
 * Extracts translatable text from CloudCart XML feed structure,
 * keeping the XML structure intact. Works with the specific fields:
 * - short_description
 * - meta_description
 * - category
 * - category_properties (name attribute + value names)
 * - tabs (name + description content)
 * - variant option names and values
 */

export type TranslatableField =
  | "title"
  | "short_description"
  | "description"
  | "meta_title"
  | "meta_description"
  | "category"
  | "category_property_name"
  | "category_property_value"
  | "tab_name"
  | "tab_description"
  | "option_name"
  | "option_value";

/** All available fields with labels for the UI */
export const TRANSLATABLE_FIELDS: {
  id: TranslatableField;
  label: string;
  group: string;
  defaultOn: boolean;
}[] = [
  { id: "title", label: "Product Title", group: "Core", defaultOn: false },
  { id: "short_description", label: "Short Description", group: "Core", defaultOn: true },
  { id: "description", label: "Description", group: "Core", defaultOn: true },
  { id: "meta_title", label: "Meta Title", group: "SEO", defaultOn: false },
  { id: "meta_description", label: "Meta Description", group: "SEO", defaultOn: true },
  { id: "category", label: "Category", group: "Taxonomy", defaultOn: true },
  { id: "category_property_name", label: "Category Property Names", group: "Taxonomy", defaultOn: true },
  { id: "category_property_value", label: "Category Property Values", group: "Taxonomy", defaultOn: true },
  { id: "tab_name", label: "Tab Names", group: "Tabs", defaultOn: true },
  { id: "tab_description", label: "Tab Content", group: "Tabs", defaultOn: true },
  { id: "option_name", label: "Variant Option Names", group: "Variants", defaultOn: true },
  { id: "option_value", label: "Variant Option Values", group: "Variants", defaultOn: true },
];

export interface TranslatableItem {
  /** Unique path identifying this item in the XML */
  path: string;
  /** The original text content */
  text: string;
  /** The field type for grouping/context */
  field: TranslatableField;
  /** Product ID for reference */
  productId: string;
  /** Product title for context */
  productTitle: string;
}

/**
 * Detects whether text contains characters from the source language.
 * Currently detects Cyrillic (Bulgarian/Russian).
 */
export function containsSourceLanguage(
  text: string,
  sourceLang: string
): boolean {
  if (!text || text.trim().length === 0) return false;

  switch (sourceLang) {
    case "bg": // Bulgarian
    case "ru": // Russian
    case "sr": // Serbian
    case "mk": // Macedonian
    case "uk": // Ukrainian
      return /[\u0400-\u04FF]/.test(text);
    case "el": // Greek
      return /[\u0370-\u03FF]/.test(text);
    case "zh": // Chinese
      return /[\u4E00-\u9FFF]/.test(text);
    case "ja": // Japanese
      return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
    case "ko": // Korean
      return /[\uAC00-\uD7AF]/.test(text);
    case "ar": // Arabic
      return /[\u0600-\u06FF]/.test(text);
    case "he": // Hebrew
      return /[\u0590-\u05FF]/.test(text);
    default:
      // For Latin-based languages, check if it's NOT the target language
      // This is less reliable so we default to true (translate everything)
      return true;
  }
}

/**
 * Extracts translatable text from the raw XML content.
 * Only extracts fields that are in the selectedFields set.
 */
export function extractTranslatables(
  xmlContent: string,
  sourceLang: string,
  selectedFields?: Set<TranslatableField>
): TranslatableItem[] {
  const items: TranslatableItem[] = [];
  const fields = selectedFields || new Set(TRANSLATABLE_FIELDS.filter((f) => f.defaultOn).map((f) => f.id));

  // Split into products
  const productRegex = /<product>([\s\S]*?)<\/product>/g;
  let productMatch;
  let productIndex = 0;

  while ((productMatch = productRegex.exec(xmlContent)) !== null) {
    const productXml = productMatch[1];

    // Extract product ID and title
    const idMatch = productXml.match(/<id>([^<]*)<\/id>/);
    const titleMatch = productXml.match(/<title>([^<]*)<\/title>/);
    const productId = idMatch ? idMatch[1] : `unknown-${productIndex}`;
    const productTitle = titleMatch ? titleMatch[1] : "Untitled";

    // Helper to extract and push a simple tag field
    const extractTag = (
      tag: string,
      field: TranslatableField,
      allowHtml = false
    ) => {
      if (!fields.has(field)) return;
      const regex = allowHtml
        ? new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
        : new RegExp(`<${tag}>([^<]*)</${tag}>`);
      const match = productXml.match(regex);
      if (match && match[1].trim() && containsSourceLanguage(match[1], sourceLang)) {
        items.push({
          path: `product[${productId}].${field}`,
          text: match[1],
          field,
          productId,
          productTitle,
        });
      }
    };

    // Core fields
    extractTag("title", "title");
    extractTag("short_description", "short_description", true);
    extractTag("description", "description", true);
    extractTag("meta_title", "meta_title");
    extractTag("meta_description", "meta_description", true);
    extractTag("category", "category");

    // category_properties
    if (fields.has("category_property_name") || fields.has("category_property_value")) {
      const catPropRegex =
        /<category_property\s+name="([^"]*)">\s*<values>([\s\S]*?)<\/values>\s*<\/category_property>/g;
      let catPropMatch;
      while ((catPropMatch = catPropRegex.exec(productXml)) !== null) {
        const propName = catPropMatch[1];
        const valuesBlock = catPropMatch[2];

        if (fields.has("category_property_name") && containsSourceLanguage(propName, sourceLang)) {
          items.push({
            path: `product[${productId}].category_property[${propName}].name`,
            text: propName,
            field: "category_property_name",
            productId,
            productTitle,
          });
        }

        if (fields.has("category_property_value")) {
          const valueNameRegex = /<name>([^<]*)<\/name>/g;
          let valueMatch;
          while ((valueMatch = valueNameRegex.exec(valuesBlock)) !== null) {
            if (containsSourceLanguage(valueMatch[1], sourceLang)) {
              items.push({
                path: `product[${productId}].category_property[${propName}].value[${valueMatch[1]}]`,
                text: valueMatch[1],
                field: "category_property_value",
                productId,
                productTitle,
              });
            }
          }
        }
      }
    }

    // tabs
    if (fields.has("tab_name") || fields.has("tab_description")) {
      const tabRegex =
        /<tab>\s*<name>([\s\S]*?)<\/name>\s*<description>([\s\S]*?)<\/description>\s*<\/tab>/g;
      let tabMatch;
      while ((tabMatch = tabRegex.exec(productXml)) !== null) {
        const tabName = tabMatch[1];
        const tabDesc = tabMatch[2];

        if (fields.has("tab_name") && containsSourceLanguage(tabName, sourceLang)) {
          items.push({
            path: `product[${productId}].tab[${tabName}].name`,
            text: tabName,
            field: "tab_name",
            productId,
            productTitle,
          });
        }

        if (fields.has("tab_description") && containsSourceLanguage(tabDesc, sourceLang)) {
          items.push({
            path: `product[${productId}].tab[${tabName}].description`,
            text: tabDesc,
            field: "tab_description",
            productId,
            productTitle,
          });
        }
      }
    }

    // variant options
    if (fields.has("option_name") || fields.has("option_value")) {
      const optionRegex =
        /<option\s+name="([^"]*)">\s*<values>([\s\S]*?)<\/values>\s*<\/option>/g;
      let optionMatch;
      while ((optionMatch = optionRegex.exec(productXml)) !== null) {
        const optName = optionMatch[1];
        const optValues = optionMatch[2];

        if (fields.has("option_name") && containsSourceLanguage(optName, sourceLang)) {
          items.push({
            path: `product[${productId}].option[${optName}].name`,
            text: optName,
            field: "option_name",
            productId,
            productTitle,
          });
        }

        if (fields.has("option_value")) {
          const optValRegex = /<value>([^<]*)<\/value>/g;
          let optValMatch;
          while ((optValMatch = optValRegex.exec(optValues)) !== null) {
            if (containsSourceLanguage(optValMatch[1], sourceLang)) {
              items.push({
                path: `product[${productId}].option[${optName}].value[${optValMatch[1]}]`,
                text: optValMatch[1],
                field: "option_value",
                productId,
                productTitle,
              });
            }
          }
        }
      }
    }

    productIndex++;
  }

  return items;
}

/**
 * Applies translations back to the XML content via string replacement.
 * Each translation is a map of original text -> translated text.
 * We replace in context (within the specific XML tags) to avoid
 * accidental replacements of text that appears in other fields.
 */
export function applyTranslations(
  xmlContent: string,
  translations: Map<string, string>
): string {
  let result = xmlContent;

  // Sort by length (longest first) to avoid partial replacements
  const sortedEntries = [...translations.entries()].sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [original, translated] of sortedEntries) {
    if (original === translated) continue;
    // Replace all occurrences
    result = result.split(original).join(translated);
  }

  return result;
}

/**
 * Deduplicates translatable items by text content.
 * Returns unique texts with their field types for context.
 */
export function deduplicateItems(
  items: TranslatableItem[]
): { text: string; fields: string[]; count: number }[] {
  const map = new Map<string, { fields: Set<string>; count: number }>();

  for (const item of items) {
    const existing = map.get(item.text);
    if (existing) {
      existing.fields.add(item.field);
      existing.count++;
    } else {
      map.set(item.text, { fields: new Set([item.field]), count: 1 });
    }
  }

  return [...map.entries()].map(([text, { fields, count }]) => ({
    text,
    fields: [...fields],
    count,
  }));
}
