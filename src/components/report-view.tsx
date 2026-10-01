"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISCLAIMER, LANGUAGES, ROLES } from "@/lib/constants";
import { loadReportPayload, type ReportPayload } from "@/lib/report-store";
import type { Declarations, RuleResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<RuleResult["status"], string> = {
  PASS: "bg-green-600 text-white",
  FAIL: "bg-red-600 text-white",
  MISSING: "bg-red-600 text-white",
  NEEDS_REVIEW: "bg-amber-500 text-black",
};

function DeclRow({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <tr className="border-b align-top">
      <td className="w-44 py-1 pr-2 text-xs font-medium text-muted-foreground">{k}</td>
      <td className="py-1 text-sm">{v?.trim() ? v : <span className="text-red-700">— not found —</span>}</td>
    </tr>
  );
}

function declarationsTable(d: Declarations) {
  const party = (p: { name: string | null; address: string | null }) => [p.name, p.address].filter(Boolean).join(", ") || null;
  return [
    ["Brand / product", [d.brandName, d.productName].filter(Boolean).join(" · ") || null],
    ["Common / generic name", d.commodityName],
    ["Manufacturer", party(d.manufacturer)],
    ["Packer", party(d.packer)],
    ["Importer", party(d.importer)],
    ["Marketer", party(d.marketer)],
    ["Net quantity", d.netQuantity?.raw],
    ["MRP", d.mrp?.raw],
    ["Month/year of manufacture / packing", d.dateOfManufacture],
    ["Best before / use by", d.bestBefore],
    ["Consumer care", [d.consumerCare?.name, d.consumerCare?.address, d.consumerCare?.phone, d.consumerCare?.email].filter(Boolean).join(" · ") || null],
    ["Country of origin", d.countryOfOrigin],
    ["Languages on label", d.languages?.join(", ") || null],
    ["Text size (estimate)", `${d.textSize?.flag ?? "unknown"}${d.textSizeNote ? ` — ${d.textSizeNote}` : ""}`],
  ] as const;
}

// sessionStorage snapshot (client only); the server snapshot is `undefined` so SSR renders the loading state.
let cachedRaw: string | null | undefined;
let cachedPayload: ReportPayload | null = null;
function getSnapshot(): ReportPayload | null {
  const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("jaanch:report");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPayload = loadReportPayload();
  }
  return cachedPayload;
}
const subscribe = () => () => {};

export function ReportView() {
  const p = useSyncExternalStore(subscribe, getSnapshot, () => undefined);

  if (p === undefined) return <div className="p-10 text-center text-sm text-muted-foreground">Loading report…</div>;
  if (!p || !p.state.rules) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="text-muted-foreground">No report in this tab yet. Run a check first.</p>
        <Button asChild className="mt-4"><Link href="/"><ArrowLeft className="size-4" /> Back to Jaanch</Link></Button>
      </div>
    );
  }
  const { state, role, language, imageDataUrl, createdAt } = p;
  const rules = state.rules!;
  const label = state.label;
  const verdictLabel = rules.verdict === "COMPLIANT" ? "Compliant" : rules.verdict === "VIOLATIONS" ? "Violations found" : "Needs review";
  const verdictCls = rules.verdict === "COMPLIANT" ? "bg-green-600" : rules.verdict === "VIOLATIONS" ? "bg-red-600" : "bg-amber-500 text-black";
  const langLabel = LANGUAGES.find((l) => l.value === language)?.english ?? language;
  const order: RuleResult["status"][] = ["FAIL", "MISSING", "NEEDS_REVIEW", "PASS"];
  const sorted = [...rules.results].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild><Link href="/"><ArrowLeft className="size-4" /> Back</Link></Button>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Save as PDF</Button>
      </div>

      <article className="rounded-xl border bg-white p-6 text-black shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold">Jaanch · जाँच — Label Compliance Report</h1>
            <p className="text-sm text-neutral-600">Legal Metrology (Packaged Commodities) Rules, 2011 — assistive check</p>
            <p className="mt-1 text-xs text-neutral-600">Generated {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })} · Role: {ROLES.find((r) => r.value === role)?.label ?? role} · Language: {langLabel} · Models: {state.models?.vision} / {state.models?.text}</p>
          </div>
          <span className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm font-bold text-white", verdictCls)}>{verdictLabel}</span>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-[260px_1fr]">
          <div>
            {imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageDataUrl} alt="Label photo" className="w-full rounded-md border object-contain" />
            ) : (
              <div className="rounded-md border p-4 text-center text-xs text-neutral-500">No image attached</div>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold">Verdict</h2>
            <p className="mt-1 text-sm leading-relaxed">{state.verdictText?.english ?? p.summary}</p>
            {state.verdictText && state.verdictText.text !== state.verdictText.english && <p className="mt-2 text-sm leading-relaxed">{state.verdictText.text}</p>}
            <p className="mt-2 text-xs text-neutral-600">{rules.counts.FAIL + rules.counts.MISSING} violation(s) · {rules.counts.NEEDS_REVIEW} need review · {rules.counts.PASS} passed{rules.exemptionsApplied.length ? ` · exemptions considered: ${rules.exemptionsApplied.join("; ")}` : ""}</p>
          </div>
        </section>

        {label && (
          <section className="mt-6">
            <h2 className="text-base font-bold">Declarations read from the label</h2>
            <table className="mt-2 w-full border-t">
              <tbody>{declarationsTable(label).map(([k, v]) => <DeclRow key={k} k={k} v={v} />)}</tbody>
            </table>
            <p className="mt-1 text-xs text-neutral-600">Extraction confidence: {Math.round((label.confidence ?? 0) * 100)}% (vision model). Values are machine-read and should be confirmed against the physical pack.</p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-base font-bold">Rule-by-rule results</h2>
          <table className="mt-2 w-full border-t text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-neutral-600">
                <th className="py-1 pr-2">Status</th><th className="py-1 pr-2">Rule</th><th className="py-1 pr-2">Finding</th><th className="py-1">Source</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.ruleId} className="border-b align-top">
                  <td className="py-1.5 pr-2"><span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-bold", STATUS_CLS[r.status])}>{r.status.replace("_", " ")}</span></td>
                  <td className="py-1.5 pr-2"><div className="font-medium">{r.title}</div><div className="text-xs text-neutral-600">{r.ruleId} · {r.severity}</div></td>
                  <td className="py-1.5 pr-2">{r.reason}{r.evidence && <div className="text-xs text-neutral-600">On label: {r.evidence}</div>}</td>
                  <td className="py-1.5 text-xs text-neutral-600">{r.source}<br /><span className="italic">unverified</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.notApplicable.length > 0 && <p className="mt-2 text-xs text-neutral-600">Not applicable: {rules.notApplicable.map((n) => `${n.title} — ${n.reason}`).join("; ")}</p>}
        </section>

        {state.compare && state.compare.mismatches.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-bold">Label vs online listing</h2>
            <ul className="mt-2 list-disc pl-5 text-sm">{state.compare.mismatches.map((m) => <li key={m.field}><strong>{m.field}:</strong> label &quot;{m.label}&quot; vs listing &quot;{m.listing}&quot; — {m.reason}</li>)}</ul>
          </section>
        )}

        {state.fixList && state.fixList.items.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-bold">Suggested corrections</h2>
            <ol className="mt-2 list-decimal pl-5 text-sm">{state.fixList.items.map((i) => <li key={i.ruleId}><strong>{i.title}:</strong> {i.correctedText}</li>)}</ol>
          </section>
        )}

        <footer className="mt-8 border-t pt-3 text-xs text-neutral-600">
          <p><strong>Disclaimer.</strong> {DISCLAIMER} Rule references are drawn from the Department of Consumer Affairs&apos; consolidated text of the Legal Metrology (Packaged Commodities) Rules, 2011 and are marked unverified until checked by a human against the official notification. Text-size findings are estimates from a photograph and require physical measurement.</p>
          <p className="mt-1">Source: {rules.sourceDocument}</p>
          <p className="mt-1">Report generated by Jaanch (open source, MIT) — inspired by SIH 2026 PS 26034.</p>
        </footer>
      </article>
    </div>
  );
}
