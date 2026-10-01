import { generateText } from "ai";
import { helperModel, groqTextOptions, extractJson, MODEL_IDS } from "@/lib/ai";
import { DeclarationsSchema, EMPTY_DECLARATIONS, type Declarations } from "@/lib/types";

const SYSTEM = `You convert e-commerce product listing text (title, bullet points, specification rows) for an Indian packaged product into the same declaration JSON that Jaanch uses for labels. Return ONLY a JSON object with keys:
brandName, productName, commodityName, manufacturer{name,address}, packer{name,address}, importer{name,address}, marketer{name,address}, netQuantity{raw,value,unit}, mrp{raw,amount,inclusiveOfAllTaxes}, dateOfManufacture, bestBefore, consumerCare{name,address,phone,email}, countryOfOrigin, isImported, category ("food"|"cosmetic"|"drug"|"tobacco"|"other"), languages (["English"] for an English listing), rawText (null), confidence (0-1).
Use null for anything not present. Never guess. "Item weight" or "Net quantity" rows map to netQuantity (unit exactly as written). The listing price (e.g. "₹199" or "M.R.P.: ₹249") maps to mrp.raw/amount; set inclusiveOfAllTaxes true only if the text says so.`;

export async function parseListingText(text: string): Promise<{ declarations: Declarations; model: string; warnings: string[] }> {
  const warnings: string[] = [];
  const { text: out } = await generateText({
    model: helperModel(),
    system: SYSTEM,
    temperature: 0,
    maxOutputTokens: 1500,
    providerOptions: groqTextOptions,
    prompt: text.slice(0, 6000),
  });
  let parsed: unknown;
  try {
    parsed = extractJson(out);
  } catch {
    warnings.push("Model did not return valid JSON for the listing.");
    return { declarations: { ...EMPTY_DECLARATIONS, rawText: text.slice(0, 2000) }, model: MODEL_IDS.helper, warnings };
  }
  const r = DeclarationsSchema.safeParse(parsed);
  const declarations = r.success ? r.data : { ...EMPTY_DECLARATIONS, ...(parsed as Partial<Declarations>) };
  declarations.textSize = { flag: "unknown", confidence: 0 };
  declarations.textSizeNote = "Not applicable to an online listing.";
  if (!declarations.rawText) declarations.rawText = text.slice(0, 2000);
  return { declarations, model: MODEL_IDS.helper, warnings };
}
