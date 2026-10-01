import type { RunState } from "./context";
import type { AgentStep } from "@/lib/types";
import { DISCLAIMER, ROLES, languageName } from "@/lib/constants";

/** Render a finished run as Markdown (used by the aiKart sandbox and the JSON API). */
export function renderMarkdown(state: RunState, steps: AgentStep[], role: string, language: string, summary: string): string {
  const rules = state.rules;
  const L: string[] = [];
  const product = state.label?.productName ?? state.listing?.productName ?? "the product";
  L.push(`# Jaanch · जाँच — Label check for **${product}**`);
  L.push("");
  if (!rules) {
    L.push(`**Could not complete the check.** ${state.extractError ?? state.listingError ?? summary}`);
    L.push("", `_${DISCLAIMER}_`);
    return L.join("\n");
  }
  const verdict = rules.verdict === "COMPLIANT" ? "✅ Compliant" : rules.verdict === "VIOLATIONS" ? "❌ Violations found" : "⚠️ Needs review";
  L.push(`## Verdict: ${verdict}`);
  L.push("");
  if (state.verdictText) {
    L.push(state.verdictText.text);
    if (state.verdictText.english !== state.verdictText.text) L.push("", `_${state.verdictText.english}_`);
  } else L.push(summary);
  L.push("", `**${rules.counts.FAIL + rules.counts.MISSING} violation(s) · ${rules.counts.NEEDS_REVIEW} to review · ${rules.counts.PASS} passed** (source: ${state.rulesSource ?? "label"})`);
  if (state.warnings?.length) L.push("", `> ${state.warnings.join(" ")}`);

  const bad = rules.results.filter((r) => r.status === "FAIL" || r.status === "MISSING");
  const rev = rules.results.filter((r) => r.status === "NEEDS_REVIEW");
  if (bad.length || rev.length) {
    L.push("", "## Findings", "", "| Status | Rule | Finding | Source |", "|---|---|---|---|");
    for (const r of [...bad, ...rev]) L.push(`| ${r.status.replace("_", " ")} | ${r.title} | ${r.reason}${r.evidence ? ` _(on label: ${r.evidence})_` : ""} | ${r.source} (unverified) |`);
  }
  if (state.compare) {
    L.push("", "## Label vs online listing", "");
    if (state.compare.mismatches.length === 0) L.push(`No mismatches on ${state.compare.compared.join(", ") || "comparable fields"}.`);
    else for (const m of state.compare.mismatches) L.push(`- **${m.field}** — pack: \`${m.label}\` · listing: \`${m.listing}\` — ${m.reason}`);
  }
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;
  if (state.grievance) {
    L.push("", `## Grievance draft (${languageName(language)}) — for the National Consumer Helpline (1915)`, "", "```", state.grievance.text, "```");
    if (state.grievance.english !== state.grievance.text) L.push("", "<details><summary>English version</summary>", "", "```", state.grievance.english, "```", "", "</details>");
  }
  if (state.fixList) {
    L.push("", "## Fix-list for the next print run", "", state.fixList.summary, "");
    state.fixList.items.forEach((it, i) => L.push(`${i + 1}. **${it.title}** (${it.ruleId})`, `   - Current: ${it.currentText ?? "_missing_"}`, `   - Corrected: \`${it.correctedText}\``, `   - ${it.note}`));
  }
  if (state.reportReady && !state.grievance && !state.fixList) {
    L.push("", "## Compliance report", "", "All declarations read from the label:", "");
    const d = state.label;
    if (d) {
      const rows: [string, string | null | undefined][] = [["Manufacturer", [d.manufacturer.name, d.manufacturer.address].filter(Boolean).join(", ")], ["Importer", [d.importer.name, d.importer.address].filter(Boolean).join(", ")], ["Net quantity", d.netQuantity.raw], ["MRP", d.mrp.raw], ["Date of manufacture/packing", d.dateOfManufacture], ["Consumer care", [d.consumerCare.phone, d.consumerCare.email].filter(Boolean).join(" · ")], ["Country of origin", d.countryOfOrigin], ["Languages", d.languages.join(", ")]];
      L.push("| Declaration | Value |", "|---|---|");
      for (const [k, v] of rows) L.push(`| ${k} | ${v?.trim() ? v : "— not found —"} |`);
    }
    L.push("", "| Status | Rule | Finding |", "|---|---|---|");
    for (const r of rules.results) L.push(`| ${r.status.replace("_", " ")} | ${r.title} | ${r.reason} |`);
  }
  L.push("", "## Agent steps", "", "| # | Tool | Why | Result | Time |", "|---|---|---|---|---|");
  steps.forEach((s, i) => L.push(`| ${i + 1} | \`${s.tool}\` | ${s.why} | ${s.summary} | ${s.durationMs != null ? (s.durationMs / 1000).toFixed(1) + "s" : ""} |`));
  L.push("", `_Role: ${roleLabel} · Language: ${languageName(language)} · Models: ${state.models?.vision} / ${state.models?.text}_`, "", `_${DISCLAIMER}_`);
  return L.join("\n");
}
