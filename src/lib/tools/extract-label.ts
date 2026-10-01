import { generateText } from "ai";
import { visionModel, groqVisionOptions, extractJson, MODEL_IDS } from "@/lib/ai";
import { DeclarationsSchema, EMPTY_DECLARATIONS, type Declarations } from "@/lib/types";

export interface ExtractLabelInput {
  /** base64 image data without the data: prefix */
  imageBase64: string;
  mediaType: string;
}
export interface ExtractLabelOutput {
  declarations: Declarations;
  model: string;
  warnings: string[];
}

const SYSTEM = `You are a meticulous label-reading assistant for Indian packaged goods. You read every declaration printed on the back-of-pack label in the photo and return ONLY a JSON object (no prose, no markdown) with this exact shape. Use null for anything not printed. Never guess values that are not visible. The label may be in any Indian script (Devanagari, Tamil, Bengali, Telugu, Gujarati, etc.) — copy text in its original script.

{
  "brandName": string|null,
  "productName": string|null,            // the marketed product name as printed
  "commodityName": string|null,          // common/generic name, e.g. "Flattened Rice (Poha)", "Toor Dal", "Extra Virgin Olive Oil"
  "manufacturer": {"name": string|null, "address": string|null},   // text after "Manufactured by"/"Mfd. by"/"निर्माता"
  "packer": {"name": string|null, "address": string|null},         // "Packed by"/"पैकर"
  "importer": {"name": string|null, "address": string|null},       // "Imported by"/"आयातक"
  "marketer": {"name": string|null, "address": string|null},       // "Marketed by"
  "netQuantity": {"raw": string|null, "value": number|null, "unit": string|null},  // raw as printed e.g. "Net Qty: 500 g"; unit exactly as printed e.g. "g", "gms", "oz", "ml", "kg", "N"
  "mrp": {"raw": string|null, "amount": number|null, "inclusiveOfAllTaxes": boolean|null},  // raw is the full MRP line as printed; inclusiveOfAllTaxes true only if words like "inclusive of all taxes"/"incl. of all taxes"/"सभी करों सहित" appear
  "dateOfManufacture": string|null,      // raw month/year of manufacture or packing as printed, e.g. "Mfg. 08/2026"
  "bestBefore": string|null,             // best before / use by / expiry as printed
  "consumerCare": {"name": string|null, "address": string|null, "phone": string|null, "email": string|null},
  "countryOfOrigin": string|null,        // ONLY from an explicit "Country of Origin: X" / "Made in X" / "Product of X" / "मूल देश" statement. NEVER infer it from the manufacturer's or importer's address. null if no such statement.
  "isImported": boolean|null,            // true if "Imported by" appears or origin is outside India
  "category": "food"|"cosmetic"|"drug"|"tobacco"|"other"|null,
  "languages": string[],                 // languages used for the declarations, e.g. ["English"], ["Hindi"], ["English","Tamil"]
  "textSize": {"flag": "small"|"normal"|"unknown", "confidence": number},  // see TEXT SIZE rule below
  "rawText": string|null,                // all legible label text, line by line, in original script
  "confidence": number,                  // 0-1 overall confidence in the extraction
  "mrpLineBox": [x1,y1,x2,y2]|null,      // tight bounding box of the single printed line containing the MRP (or the net quantity line if there is no MRP), normalised 0-1000 of image width/height, y downward
  "bodyTextLineBox": [x1,y1,x2,y2]|null  // tight bounding box of ONE line of ordinary descriptive body text (product description, ingredients or nutrition row), normalised 0-1000
}

TEXT SIZE rule: compare the letter height of the mandatory declarations (net quantity, MRP, manufacturer address, consumer care) with the other body text on the pack (product description, nutrition table). If the declaration letters are clearly smaller than the body text (roughly half the height or less), or you have to strain / zoom to read them, set textSize.flag = "small". Only set "normal" when the declaration letters are at least as tall as the ordinary body text.

If a company name and address appear without "manufactured by"/"packed by" wording, put them under manufacturer. If the same name/address is given for consumer complaints, also fill consumerCare. Copy phone numbers and emails exactly.`;

export async function extractLabel(input: ExtractLabelInput): Promise<ExtractLabelOutput> {
  const warnings: string[] = [];
  const { text } = await generateText({
    model: visionModel(),
    system: SYSTEM,
    temperature: 0,
    maxOutputTokens: 2500,
    providerOptions: groqVisionOptions,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Read this packaged-product label and return the JSON object." },
          { type: "file", data: input.imageBase64, mediaType: input.mediaType },
        ],
      },
    ],
  });

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    warnings.push("Model did not return valid JSON; treating all declarations as missing.");
    return { declarations: { ...EMPTY_DECLARATIONS, rawText: text.slice(0, 2000) }, model: MODEL_IDS.vision, warnings };
  }

  const result = DeclarationsSchema.safeParse(parsed);
  const declarations: Declarations = result.success ? result.data : { ...EMPTY_DECLARATIONS, ...(parsed as Partial<Declarations>) };
  if (!result.success) warnings.push("Some fields did not match the expected schema and were normalised.");
  applyTextSizeEstimate(declarations);
  return { declarations, model: MODEL_IDS.vision, warnings };
}

/**
 * Deterministic text-size estimate: compare the height of the MRP line with the height of an
 * ordinary body-text line, both reported by the vision model as bounding boxes. The model's own
 * "small"/"normal" guess is only used as a fallback when boxes are missing or implausible.
 */
export function applyTextSizeEstimate(d: Declarations): void {
  const h = (b: number[] | null) => (b && b.length === 4 ? Math.abs(b[3] - b[1]) : 0);
  const mrpH = h(d.mrpLineBox);
  const bodyH = h(d.bodyTextLineBox);
  if (mrpH > 0 && bodyH > 0 && mrpH < 200 && bodyH < 200) {
    const ratio = mrpH / bodyH;
    const small = ratio < 0.85;
    d.textSize = { flag: small ? "small" : "normal", confidence: Math.min(0.9, Math.max(0.5, Math.abs(ratio - 0.85) * 2 + 0.5)) };
    d.textSizeNote = `Declaration line height ≈ ${Math.round(ratio * 100)}% of body-text line height (from image bounding boxes).`;
  } else if (!d.textSizeNote) {
    d.textSizeNote = "Estimated from the model's visual judgement; no bounding boxes available.";
  }
}
