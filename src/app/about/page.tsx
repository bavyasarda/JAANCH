import type { Metadata } from "next";
import { DISCLAIMER } from "@/lib/constants";
import { AGENT_WORKFLOW_MERMAID } from "@/lib/diagram";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "About — Jaanch" };

const CREDITS: [string, string][] = [
  ["Next.js, React, TypeScript", "App framework (MIT)"],
  ["Tailwind CSS, shadcn/ui, Radix UI, lucide-react", "UI (MIT)"],
  ["Vercel AI SDK (ai, @ai-sdk/groq, @ai-sdk/openai-compatible)", "Tool-calling agent loop (Apache-2.0)"],
  ["Groq-served open-weight models: Qwen 3.8 27B (vision), OpenAI gpt-oss-120b / 20b (Apache-2.0)", "Extraction, planning, explanation, drafting"],
  ["cheerio, zod, sharp, mermaid, next-themes", "Scraping, validation, test-label rendering, diagrams, theming"],
  ["Noto Sans + Noto Sans Devanagari / Tamil / Bengali / Telugu (Google Fonts, OFL)", "Indic typography"],
  ["Web Speech API", "Voice input and spoken verdicts in the browser"],
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <section>
        <h1 className="text-3xl font-bold">About Jaanch · जाँच</h1>
        <p className="mt-3 text-muted-foreground">
          <strong className="text-foreground">The problem.</strong> Every pre-packaged product sold in India must carry a fixed set of declarations under the
          Legal Metrology (Packaged Commodities) Rules, 2011 — who made it, how much is inside, the MRP inclusive of all taxes,
          when it was packed, whom to call, and where it came from. Most shoppers cannot tell a compliant pack from a non-compliant
          one, small sellers get fined for mistakes they did not know about, and inspectors check packs by hand. The rules exist
          mostly in English legalese. Inspired by SIH 2026 problem statement 26034 (Ministry of Consumer Affairs).
        </p>
        <p className="mt-3 text-muted-foreground">
          <strong className="text-foreground">The solution.</strong> Jaanch reads the label (or the online listing), runs a deterministic rule engine, and then
          explains the result in the user&apos;s own Indian language — by text and by voice — before taking the next step for them:
          a helpline grievance for consumers, a fix-list for sellers, a printable report for inspectors.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">How it works</h2>
        <p className="mt-2 text-sm text-muted-foreground">Orange nodes are LLM-powered (open-weight models served by Groq). Green nodes are deterministic TypeScript — the only place pass/fail decisions are made.</p>
        <Card className="mt-3"><CardContent className="overflow-x-auto p-4"><MermaidDiagram chart={AGENT_WORKFLOW_MERMAID} className="[&_svg]:mx-auto [&_svg]:max-w-full" /></CardContent></Card>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>The planner model decides which tools to call and gives a one-line reason for each call — that reason is what you see in the Agent steps timeline.</li>
          <li><code>extractLabel</code> asks the vision model for structured JSON of every declaration, in any Indian script, plus bounding boxes used to estimate text size.</li>
          <li><code>checkRules</code> is plain TypeScript over <code>rules.json</code>. Every rule cites its source and is marked <code>verified: false</code> until a human checks it. Text-size checks can only ever be &ldquo;needs review&rdquo;.</li>
          <li>Verdicts, grievances and fix-lists are generated from the rule output in the chosen language; the model may rephrase and translate but cannot change a result.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Open-source credits</h2>
        <ul className="mt-3 divide-y rounded-lg border text-sm">
          {CREDITS.map(([a, b]) => (
            <li key={a} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[1fr_auto] sm:gap-4"><span>{a}</span><span className="text-muted-foreground">{b}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Rules text: Department of Consumer Affairs, consolidated Legal Metrology (Packaged Commodities) Rules, 2011 with amendments. Jaanch itself is MIT-licensed.</p>
      </section>

      <section className="rounded-lg border bg-accent/40 p-4 text-sm">
        <p className="font-semibold">Disclaimer</p>
        <p className="mt-1 text-muted-foreground">{DISCLAIMER} Results depend on photo quality and machine reading; rule references have not yet been verified against the official notification by a human. Nothing here is legal advice.</p>
      </section>
    </div>
  );
}
