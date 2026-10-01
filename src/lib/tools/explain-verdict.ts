import { generateText } from "ai";
import { helperModel, groqTextOptions, extractJson } from "@/lib/ai";
import { languageName } from "@/lib/constants";
import type { CheckRulesOutput, CompareOutput } from "@/lib/types";
import type { VerdictText } from "@/lib/agent/context";

/** Deterministic English facts for the LLM to explain — it must not add legal claims of its own. */
export function verdictFacts(rules: CheckRulesOutput, compare?: CompareOutput, productName?: string | null): string {
  const lines: string[] = [];
  lines.push(`Product: ${productName ?? "unknown"}.`);
  lines.push(`Overall verdict: ${rules.verdict === "COMPLIANT" ? "Compliant" : rules.verdict === "VIOLATIONS" ? "Violations found" : "Needs review"}.`);
  const bad = rules.results.filter((r) => r.status === "FAIL" || r.status === "MISSING");
  const rev = rules.results.filter((r) => r.status === "NEEDS_REVIEW");
  if (bad.length) lines.push(`Violations (${bad.length}): ` + bad.map((r) => `${r.title} — ${r.status} — ${r.reason} [${r.source}]`).join(" | "));
  if (rev.length) lines.push(`Needs review (${rev.length}): ` + rev.map((r) => `${r.title} — ${r.reason}`).join(" | "));
  if (compare?.mismatches.length) lines.push(`Label vs online listing mismatches (${compare.mismatches.length}): ` + compare.mismatches.map((m) => `${m.field}: pack says '${m.label}', listing says '${m.listing}' — ${m.reason}`).join(" | "));
  else if (compare) lines.push(`Label vs online listing: no mismatches on ${compare.compared.join(", ") || "comparable fields"}.`);
  lines.push(`Rules passed: ${rules.counts.PASS}.`);
  return lines.join("\n");
}

export async function explainVerdict(args: { facts: string; language: string; question?: string }): Promise<VerdictText> {
  const lang = languageName(args.language);
  const q = args.question?.trim();
  const { text } = await generateText({
    model: helperModel(),
    temperature: 0.2,
    maxOutputTokens: 900,
    providerOptions: groqTextOptions,
    system: `You explain packaged-goods label check results to ordinary people in India in simple words. Use ONLY the facts given; do not add rules, penalties or legal claims that are not in the facts. Keep it to 3-5 short sentences, friendly and clear, mention each violation plainly.${q ? ` The user also asked: "${q}" — answer it in one extra sentence using only the facts (say if the facts cannot answer it).` : ""} Return ONLY JSON: {"text": "<explanation in ${lang}>", "english": "<same explanation in English>"}. ${lang === "English" ? 'Set "text" and "english" to the same English explanation.' : `Write "text" in natural ${lang} (native script), not transliterated English.`}`,
    prompt: args.facts,
  });
  try {
    const j = extractJson(text) as { text?: string; english?: string };
    return { language: args.language, text: j.text ?? j.english ?? text, english: j.english ?? j.text ?? text };
  } catch {
    return { language: args.language, text, english: text };
  }
}

export async function translate(args: { text: string; language: string }): Promise<string> {
  const lang = languageName(args.language);
  if (lang === "English") return args.text;
  const { text } = await generateText({
    model: helperModel(),
    temperature: 0.1,
    maxOutputTokens: 1200,
    providerOptions: groqTextOptions,
    system: `Translate the user's text into natural ${lang} (native script). Keep numbers, units, currency, names, phone numbers and emails unchanged. Return only the translation.`,
    prompt: args.text,
  });
  return text.trim();
}
