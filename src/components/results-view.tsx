"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, Volume2, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISCLAIMER, LANGUAGES, type Role } from "@/lib/constants";
import { ActionPanel } from "@/components/action-panel";
import type { RunState } from "@/lib/agent/context";
import type { RuleResult, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT = {
  COMPLIANT: { label: "Compliant", hi: "अनुपालन ठीक है", Icon: CheckCircle2, cls: "border-green-600/40 bg-green-600/10 text-green-800 dark:text-green-300" },
  VIOLATIONS: { label: "Violations found", hi: "उल्लंघन मिले", Icon: XCircle, cls: "border-red-600/40 bg-red-600/10 text-red-800 dark:text-red-300" },
  NEEDS_REVIEW: { label: "Needs review", hi: "समीक्षा ज़रूरी", Icon: AlertTriangle, cls: "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300" },
} as const;

const SEV: Record<Severity, string> = {
  high: "bg-red-600/15 text-red-800 dark:text-red-300 border-red-600/30",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30",
  low: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-600/30",
};
const STATUS: Record<RuleResult["status"], string> = {
  FAIL: "bg-red-600 text-white",
  MISSING: "bg-red-600 text-white",
  NEEDS_REVIEW: "bg-amber-500 text-black",
  PASS: "bg-green-600 text-white",
};

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const speak = (text: string, lang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === lang) ?? voices.find((x) => x.lang.startsWith(lang.split("-")[0]));
    if (v) u.voice = v;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };
  return { speak, stop, speaking };
}

function RuleRow({ r }: { r: RuleResult }) {
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide", STATUS[r.status])}>{r.status.replace("_", " ")}</span>
        <span className="font-medium">{r.title}</span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", SEV[r.severity])}>{r.severity}</span>
      </div>
      <p className="text-sm text-muted-foreground">{r.reason}</p>
      {r.evidence && <p className="text-xs"><span className="text-muted-foreground">On label:</span> <span className="rounded bg-muted px-1 py-0.5">{r.evidence}</span></p>}
      <p className="text-xs text-muted-foreground">{r.ruleId} · {r.source} · <span title="Not yet verified against the official text by a human">unverified</span></p>
    </li>
  );
}

export function ResultsView({ state, language, summary, role, imageDataUrl }: { state: RunState; language: string; summary: string; role: Role; imageDataUrl?: string }) {
  const [showPass, setShowPass] = useState(false);
  const { speak, stop, speaking } = useSpeak();
  const rules = state.rules;
  if (!rules) return null;
  const v = VERDICT[rules.verdict];
  const bad = rules.results.filter((r) => r.status === "FAIL" || r.status === "MISSING");
  const rev = rules.results.filter((r) => r.status === "NEEDS_REVIEW");
  const pass = rules.results.filter((r) => r.status === "PASS");
  const verdictText = state.verdictText?.text ?? summary;
  const langLabel = LANGUAGES.find((l) => l.value === language)?.label ?? language;

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn("border-2", v.cls)}>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <v.Icon className="size-9 shrink-0" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">Verdict · फ़ैसला</p>
                <h2 className="text-2xl font-bold leading-tight">{v.label} <span className="font-semibold opacity-80">· {v.hi}</span></h2>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 bg-background/70" onClick={() => (speaking ? stop() : speak(verdictText, language))}>
              {speaking ? <Square className="size-4" /> : <Volume2 className="size-4" />} {speaking ? "Stop" : `Listen (${langLabel})`}
            </Button>
          </div>
          {state.label?.productName && <p className="text-sm opacity-90">Product: <strong>{state.label.productName}</strong>{state.label.commodityName ? ` · ${state.label.commodityName}` : ""}</p>}
          <p className="text-base leading-relaxed">{verdictText}</p>
          {state.verdictText && state.verdictText.english !== state.verdictText.text && <p className="text-sm opacity-80">{state.verdictText.english}</p>}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-background/60">{bad.length} violations</Badge>
            <Badge variant="outline" className="bg-background/60">{rev.length} to review</Badge>
            <Badge variant="outline" className="bg-background/60">{pass.length} passed</Badge>
          </div>
          <p className="text-xs opacity-75">{DISCLAIMER}</p>
        </CardContent>
      </Card>

      <ActionPanel state={state} role={role} language={language} imageDataUrl={imageDataUrl} summary={summary} />

      {(bad.length > 0 || rev.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Findings · निष्कर्ष</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {bad.map((r) => <RuleRow key={r.ruleId} r={r} />)}
              {rev.map((r) => <RuleRow key={r.ruleId} r={r} />)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <button type="button" onClick={() => setShowPass((s) => !s)} className="flex w-full items-center justify-between text-left">
            <CardTitle className="text-base">Passed checks ({pass.length})</CardTitle>
            <ChevronDown className={cn("size-4 transition-transform", showPass && "rotate-180")} />
          </button>
        </CardHeader>
        {showPass && (
          <CardContent>
            <ul className="divide-y">{pass.map((r) => <RuleRow key={r.ruleId} r={r} />)}</ul>
            {rules.notApplicable.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">Not applicable: {rules.notApplicable.map((n) => `${n.title} (${n.reason})`).join("; ")}</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
