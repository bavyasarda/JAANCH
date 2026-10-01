"use client";
import { CheckCircle2, CircleAlert, Loader2, Brain, ScanText, Scale, Languages, FileText, Wrench, Globe, GitCompare, Zap } from "lucide-react";
import type { AgentStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  plan: Brain,
  extractLabel: ScanText,
  checkRules: Scale,
  explainVerdict: Languages,
  translate: Languages,
  draftGrievance: FileText,
  makeFixList: Wrench,
  prepareReport: FileText,
  scrapeListing: Globe,
  parseListingText: Globe,
  compareLabelListing: GitCompare,
  fallback: Zap,
};

export function AgentSteps({ steps, running }: { steps: AgentStep[]; running: boolean }) {
  if (steps.length === 0 && !running) return null;
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">Agent steps</h3>
        <span className="text-xs text-muted-foreground">{steps.filter((s) => s.status === "done").length} done{running ? " · working…" : ""}</span>
      </div>
      <ol className="divide-y">
        {steps.map((s, i) => {
          const Icon = ICONS[s.tool] ?? Brain;
          return (
            <li key={s.id} className="flex gap-3 px-4 py-3">
              <div className="flex flex-col items-center">
                <span className={cn("grid size-7 place-items-center rounded-full border", s.status === "done" && "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400", s.status === "running" && "border-primary/40 bg-primary/10 text-primary", s.status === "error" && "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-400")}>
                  {s.status === "running" ? <Loader2 className="size-4 animate-spin" /> : s.status === "error" ? <CircleAlert className="size-4" /> : <Icon className="size-4" />}
                </span>
                {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{s.tool}</code>
                  {s.durationMs != null && <span className="text-xs text-muted-foreground">{(s.durationMs / 1000).toFixed(1)}s</span>}
                  {s.status === "done" && <CheckCircle2 className="size-3.5 text-green-600" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Why:</span> {s.why}</p>
                {s.summary && <p className={cn("mt-0.5 text-sm", s.status === "error" && "text-red-700 dark:text-red-400")}>{s.summary}</p>}
              </div>
            </li>
          );
        })}
        {running && steps.every((s) => s.status !== "running") && (
          <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Thinking…</li>
        )}
      </ol>
    </div>
  );
}
