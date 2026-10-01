import { generateText } from "ai";
import { helperModel, groqTextOptions, extractJson } from "@/lib/ai";
import { languageName } from "@/lib/constants";
import type { CheckRulesOutput, CompareOutput, Declarations } from "@/lib/types";
import type { GrievanceDraft } from "@/lib/agent/context";

/** Deterministic English grievance body — the LLM only translates / polishes, never adds claims. */
export function grievanceFacts(label: Declarations | undefined, rules: CheckRulesOutput, compare?: CompareOutput, listingUrl?: string): { subject: string; body: string } {
  const bad = rules.results.filter((r) => r.status === "FAIL" || r.status === "MISSING");
  const rev = rules.results.filter((r) => r.status === "NEEDS_REVIEW");
  const product = label?.productName ?? label?.commodityName ?? "the packaged product";
  const party = label?.manufacturer?.name ?? label?.packer?.name ?? label?.importer?.name ?? label?.marketer?.name ?? "the manufacturer / packer (name not legible on the pack)";
  const subject = `Grievance: label of "${product}" appears to violate the Legal Metrology (Packaged Commodities) Rules, 2011`;
  const lines = [
    `To: National Consumer Helpline (1915 / consumerhelpline.gov.in)`,
    ``,
    `Subject: ${subject}`,
    ``,
    `I purchased the packaged product "${product}"${label?.netQuantity?.raw ? ` (${label.netQuantity.raw})` : ""}${label?.mrp?.raw ? `, ${label.mrp.raw}` : ""}, sold by ${party}${label?.manufacturer?.address ? `, ${label.manufacturer.address}` : ""}.`,
    ``,
    `On checking the label against the Legal Metrology (Packaged Commodities) Rules, 2011, I found the following apparent violations:`,
    ...bad.map((r, i) => `${i + 1}. ${r.title}: ${r.reason} (${r.source})`),
  ];
  if (rev.length) lines.push(``, `The following points also need verification by the Legal Metrology department:`, ...rev.map((r, i) => `${i + 1}. ${r.title}: ${r.reason}`));
  if (compare?.mismatches.length) lines.push(``, `The online listing${listingUrl ? ` (${listingUrl})` : ""} also differs from the pack:`, ...compare.mismatches.map((m, i) => `${i + 1}. ${m.field}: listing says "${m.listing}" but the pack says "${m.label}".`));
  lines.push(``, `I request that this be examined and appropriate action taken under the Legal Metrology Act, 2009 and the Rules made thereunder. I can provide the photograph of the pack and the purchase bill.`, ``, `Name: ____________________`, `Mobile: ____________________`, `Place of purchase and date: ____________________`, ``, `(Drafted with Jaanch, an assistive tool. This is not an official Legal Metrology finding.)`);
  return { subject, body: lines.join("\n") };
}

export async function draftGrievance(args: { label?: Declarations; rules: CheckRulesOutput; compare?: CompareOutput; listingUrl?: string; language: string }): Promise<GrievanceDraft> {
  const { subject, body } = grievanceFacts(args.label, args.rules, args.compare, args.listingUrl);
  const lang = languageName(args.language);
  if (lang === "English") return { language: args.language, subject, text: body, english: body };
  const { text } = await generateText({
    model: helperModel(),
    temperature: 0.1,
    maxOutputTokens: 1800,
    providerOptions: groqTextOptions,
    system: `Translate this consumer grievance letter into formal, natural ${lang} (native script) suitable for the National Consumer Helpline. Keep product names, company names, addresses, numbers, rule references (e.g. "Rule 6(1)(e)"), phone numbers and blanks (____) exactly as they are. Do not add or remove any complaint point. Return ONLY JSON: {"text": "<translated letter>"}.`,
    prompt: body,
  });
  let translated = text.trim();
  try {
    const j = extractJson(text) as { text?: string };
    if (j.text) translated = j.text;
  } catch {
    /* use raw text */
  }
  return { language: args.language, subject, text: translated, english: body };
}
