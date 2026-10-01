import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";
import rulesFile from "@/data/rules.json";
import type { Rule } from "@/lib/types";
import { DISCLAIMER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rules — Jaanch" };

const SEV: Record<string, string> = {
  high: "bg-red-600/15 text-red-800 dark:text-red-300 border-red-600/30",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30",
  low: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-600/30",
};
const CHECK: Record<string, string> = {
  present: "Presence check — the field must be non-empty.",
  pattern: "Regular-expression check on the field.",
  custom: "Custom deterministic check in check-rules.ts.",
};

export default function RulesPage() {
  const { rules, sourceDocument } = rulesFile as { rules: Rule[]; sourceDocument: string };
  const verified = rules.filter((r) => (r.verified as boolean) === true).length;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <section>
        <h1 className="text-3xl font-bold">The rules Jaanch checks</h1>
        <p className="mt-3 text-muted-foreground">
          Every pass/fail decision comes from this list and from plain TypeScript in <code>src/lib/tools/check-rules.ts</code>. The language
          model never decides compliance. Each rule names its clause in the Legal Metrology (Packaged Commodities) Rules, 2011 and links to the
          Department of Consumer Affairs&apos; consolidated text. No clause has been invented.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"><ShieldQuestion className="size-4 text-amber-600" /> {rules.length - verified} awaiting human verification</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"><ShieldCheck className="size-4 text-green-600" /> {verified} verified</span>
          <a href={sourceDocument} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">Official consolidated text (PDF) <ExternalLink className="size-3.5" /></a>
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {rules.map((r, i) => (
          <li key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              <h2 className="font-semibold">{r.title}</h2>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", SEV[r.severity])}>{r.severity}</span>
              <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", r.verified ? "border-green-600/30 text-green-700" : "border-amber-600/30 text-amber-700 dark:text-amber-300")}>
                {r.verified ? <ShieldCheck className="size-3" /> : <ShieldQuestion className="size-3" />} {r.verified ? "verified" : "unverified"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
            <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">Source</dt><dd>{r.source}</dd>
              <dt className="text-muted-foreground">Rule id</dt><dd><code>{r.id}</code></dd>
              <dt className="text-muted-foreground">Field</dt><dd><code>{r.field}</code></dd>
              <dt className="text-muted-foreground">Check</dt><dd>{CHECK[r.check]}{r.customCheck ? ` (${r.customCheck})` : ""}{r.customCheck === "textSize" ? " Can only return PASS or NEEDS_REVIEW — never FAIL." : ""}</dd>
              <dt className="text-muted-foreground">Applies to</dt><dd>{r.appliesTo === "all" ? "All packages" : r.appliesTo === "imported" ? "Imported packages only" : "Domestic packages only"}</dd>
              {r.exemptions.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Exemptions</dt>
                  <dd>{r.exemptions.map((e) => `Net quantity ≤ ${e.value} ${e.units.join("/")}${e.unless?.length ? ` (except ${e.unless.join(", ")})` : ""} — ${e.source}`).join("; ")}. A failing rule becomes NEEDS_REVIEW when an exemption may apply.</dd>
                </>
              )}
            </dl>
          </li>
        ))}
      </ol>

      <p className="rounded-lg border bg-accent/40 p-3 text-xs text-muted-foreground">{DISCLAIMER} To verify a rule, compare its description with the cited clause in the official text and set <code>&quot;verified&quot;: true</code> in <code>src/data/rules.json</code>. <Link href="/" className="text-primary underline-offset-2 hover:underline">Back to Jaanch</Link></p>
    </div>
  );
}
