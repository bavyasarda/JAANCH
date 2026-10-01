import { generateText } from "ai";
import { helperModel, groqTextOptions, extractJson } from "@/lib/ai";
import { languageName } from "@/lib/constants";
import type { CheckRulesOutput, Declarations, RuleResult } from "@/lib/types";
import type { FixList, FixListItem } from "@/lib/agent/context";

function pick(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) if (v && v.trim()) return v.trim();
  return null;
}

/** Deterministic corrected-label text per failing rule. Placeholders in [brackets] are for the seller to fill. */
export function buildFixList(label: Declarations | undefined, rules: CheckRulesOutput): FixListItem[] {
  const l = label;
  const party = pick(l?.manufacturer?.name, l?.packer?.name, l?.importer?.name, l?.marketer?.name) ?? "[Company name]";
  const addr = pick(l?.manufacturer?.address, l?.packer?.address, l?.importer?.address, l?.marketer?.address);
  const amount = l?.mrp?.amount != null ? l.mrp.amount.toFixed(2) : "[xx.xx]";
  const qtyVal = l?.netQuantity?.value;
  const qtyUnit = l?.netQuantity?.unit?.toLowerCase().replace(/[.\s]/g, "") ?? "";
  const items: FixListItem[] = [];

  const fixFor = (r: RuleResult): FixListItem | null => {
    const base = { ruleId: r.ruleId, title: r.title };
    switch (r.ruleId) {
      case "LMPC-6-1-a-NAME":
        return { ...base, currentText: null, correctedText: `Manufactured by: [Company name], [Complete address with PIN code]`, note: "Print the legal name of the manufacturer (and packer / importer if different) with the qualifying words." };
      case "LMPC-6-1-a-ADDRESS":
        return { ...base, currentText: addr, correctedText: `${l?.importer?.name ? "Imported by" : "Manufactured & Packed by"}: ${party}, [Plot/Street], [Area], [City] [6-digit PIN], [State], India`, note: "Add the complete postal address including PIN code (Rule 10(1))." };
      case "LMPC-6-1-aa-ORIGIN":
        return { ...base, currentText: l?.countryOfOrigin ?? null, correctedText: `Country of Origin: [Country]`, note: "Mandatory for imported goods since 1 Jan 2018 (Rule 6(1)(aa))." };
      case "LMPC-6-1-b-GENERIC-NAME":
        return { ...base, currentText: l?.commodityName ?? null, correctedText: `[Common / generic name of the commodity, e.g. "Toor Dal", "Butter Cookies"]`, note: "A brand name alone is not enough; print the generic name near the product name." };
      case "LMPC-6-1-c-NET-QTY":
        return { ...base, currentText: l?.netQuantity?.raw ?? null, correctedText: `Net Quantity: [number] g / kg / ml / l / N`, note: "Declare the net quantity in standard units on the principal display panel." };
      case "LMPC-13-STANDARD-UNITS": {
        let suggestion = "Net Quantity: [number] g";
        if (qtyVal != null) {
          if (["oz", "ounce", "ounces"].includes(qtyUnit)) suggestion = `Net Quantity: ${Math.round(qtyVal * 28.3495)} g`;
          else if (["lb", "lbs", "pound", "pounds"].includes(qtyUnit)) suggestion = `Net Quantity: ${(qtyVal * 0.453592).toFixed(2).replace(/\.?0+$/, "")} kg`;
          else if (["floz", "fl.oz"].includes(qtyUnit)) suggestion = `Net Quantity: ${Math.round(qtyVal * 29.5735)} ml`;
          else if (["gm", "gms", "gram", "grams"].includes(qtyUnit)) suggestion = `Net Quantity: ${qtyVal} g`;
          else if (["ltr", "lt", "litre", "liter", "ltrs"].includes(qtyUnit)) suggestion = `Net Quantity: ${qtyVal} l`;
          else if (["pcs", "pc", "nos", "no", "pieces", "units"].includes(qtyUnit)) suggestion = `Net Quantity: ${qtyVal} N`;
          else if (qtyUnit === "kg" && qtyVal < 1) suggestion = `Net Quantity: ${Math.round(qtyVal * 1000)} g`;
          else if (qtyUnit === "l" && qtyVal < 1) suggestion = `Net Quantity: ${Math.round(qtyVal * 1000)} ml`;
        }
        return { ...base, currentText: l?.netQuantity?.raw ?? null, correctedText: suggestion, note: "Use g below 1 kg and kg at or above; ml below 1 litre and l at or above (Rule 13). Check the converted figure on a calibrated scale." };
      }
      case "LMPC-6-1-d-DATE":
        return { ...base, currentText: l?.dateOfManufacture ?? null, correctedText: `Date of Manufacture / Packing: [MM/YYYY]`, note: "Print month and year of manufacture or packing (import date for imports)." };
      case "LMPC-6-1-e-MRP":
        return { ...base, currentText: null, correctedText: `MRP ₹ ${amount} (inclusive of all taxes)`, note: "Print the maximum retail price in Indian currency on the principal display panel." };
      case "LMPC-6-1-e-MRP-TAXES":
        return { ...base, currentText: l?.mrp?.raw ?? null, correctedText: `MRP ₹ ${amount} (inclusive of all taxes)`, note: "Add the words 'inclusive of all taxes' (or 'incl. of all taxes') next to the MRP." };
      case "LMPC-6-2-CONSUMER-CARE": {
        const cc = l?.consumerCare;
        return { ...base, currentText: pick(cc?.phone, cc?.email, cc?.name), correctedText: `Consumer Care: ${cc?.name ?? party}, ${cc?.address ?? addr ?? "[address]"} · Phone: ${cc?.phone ?? "[toll-free / phone number]"} · E-mail: ${cc?.email ?? "[email address]"}`, note: "Rule 6(2) requires name, address, telephone number and e-mail for consumer complaints." };
      }
      case "LMPC-9-4-LANGUAGE":
        return { ...base, currentText: l?.languages?.join(", ") ?? null, correctedText: `Print all mandatory declarations in English or Hindi (Devanagari); keep the regional language as an addition.`, note: "Rule 9(4)." };
      case "LMPC-7-2-TEXT-SIZE":
        return { ...base, currentText: null, correctedText: `Increase declaration letter height to the minimum for your panel area (e.g. 2.5 mm for a 100–500 cm² panel, 4 mm for 500–2500 cm²); width at least one third of height.`, note: "Rule 7(2) Table I. Measure the principal display panel to pick the right row." };
      default:
        return null;
    }
  };

  for (const r of rules.results) {
    if (r.status === "PASS") continue;
    const f = fixFor(r);
    if (f) items.push(f);
  }
  return items;
}

export async function makeFixList(args: { label?: Declarations; rules: CheckRulesOutput; language: string }): Promise<FixList> {
  const items = buildFixList(args.label, args.rules);
  const lang = languageName(args.language);
  const summaryEn = items.length === 0 ? "No corrections needed — all checked declarations are present and in the required format." : `${items.length} correction(s) needed before the next print run. Replace each current text with the corrected text below, then re-check with Jaanch.`;
  if (lang === "English" || items.length === 0) return { language: args.language, items, summary: summaryEn };

  // Translate only the notes and summary; corrected label text stays in English (allowed under Rule 9(4)).
  const { text } = await generateText({
    model: helperModel(),
    temperature: 0.1,
    maxOutputTokens: 1200,
    providerOptions: groqTextOptions,
    system: `Translate the given JSON strings into natural ${lang} (native script). Keep rule references, numbers and units unchanged. Return ONLY JSON of the same shape: {"summary": string, "notes": string[]}.`,
    prompt: JSON.stringify({ summary: summaryEn, notes: items.map((i) => i.note) }),
  });
  try {
    const j = extractJson(text) as { summary?: string; notes?: string[] };
    return { language: args.language, summary: j.summary ?? summaryEn, items: items.map((it, i) => ({ ...it, note: j.notes?.[i] ?? it.note })) };
  } catch {
    return { language: args.language, items, summary: summaryEn };
  }
}
