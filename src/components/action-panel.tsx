"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, FileText, Wrench, Printer, ExternalLink, MessageCircle } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGES, type Role } from "@/lib/constants";
import type { RunState } from "@/lib/agent/context";
import { saveReportPayload } from "@/lib/report-store";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copied" : label}
    </Button>
  );
}

function WhatsAppButton({ text, label }: { text: string; label: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(text.slice(0, 4000))}`;
  return (
    <Button size="sm" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer"><MessageCircle className="size-4 text-green-600" /> {label}</a>
    </Button>
  );
}

export function ActionPanel({ state, role, language, imageDataUrl, summary }: { state: RunState; role: Role; language: string; imageDataUrl?: string; summary: string }) {
  const router = useRouter();
  const langLabel = LANGUAGES.find((l) => l.value === language)?.label ?? language;
  const openReport = () => {
    saveReportPayload({ state, role, language, imageDataUrl, summary, createdAt: new Date().toISOString() });
    router.push("/report");
  };

  if (role === "consumer" && state.grievance) {
    const g = state.grievance;
    const bilingual = g.text !== g.english;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary" /> {language === "en-IN" ? "Grievance draft" : `Grievance draft · ${t(language, "grievance")}`}</CardTitle>
          <Button size="sm" variant="ghost" asChild><a href="https://consumerhelpline.gov.in/" target="_blank" rel="noreferrer">NCH portal <ExternalLink className="size-3.5" /></a></Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Register on the National Consumer Helpline (1915 / consumerhelpline.gov.in) and paste this text. Fill in the blanks before sending.</p>
          <Tabs defaultValue={bilingual ? "local" : "en"}>
            <TabsList>
              {bilingual && <TabsTrigger value="local">{langLabel}</TabsTrigger>}
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>
            {bilingual && (
              <TabsContent value="local" className="flex flex-col gap-2">
                <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-sans text-sm leading-relaxed">{g.text}</pre>
                <div className="flex flex-wrap gap-2"><CopyButton text={g.text} label={`${t(language, "copy")} ${langLabel}`} /><WhatsAppButton text={g.text} label={t(language, "shareWhatsApp")} /></div>
              </TabsContent>
            )}
            <TabsContent value="en" className="flex flex-col gap-2">
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-sans text-sm leading-relaxed">{g.english}</pre>
              <div className="flex flex-wrap gap-2"><CopyButton text={g.english} label="Copy English" /><WhatsAppButton text={g.english} label="Share on WhatsApp" /></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  if (role === "seller" && state.fixList) {
    const f = state.fixList;
    const all = f.items.map((i) => `${i.title}\n  Current: ${i.currentText ?? "(missing)"}\n  Corrected: ${i.correctedText}\n  Note: ${i.note}`).join("\n\n");
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Wrench className="size-4 text-primary" /> {t(language, "fixList")}</CardTitle>
          {f.items.length > 0 && <CopyButton text={all} label="Copy all" />}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{f.summary}</p>
          <ol className="flex flex-col gap-3">
            {f.items.map((it, i) => (
              <li key={it.ruleId} className="rounded-lg border p-3">
                <p className="text-sm font-semibold">{i + 1}. {it.title} <span className="text-xs font-normal text-muted-foreground">({it.ruleId})</span></p>
                {it.currentText && <p className="mt-1 text-xs text-muted-foreground">Current: <span className="line-through">{it.currentText}</span></p>}
                <div className="mt-1 flex items-start justify-between gap-2">
                  <p className="rounded bg-green-600/10 px-2 py-1 text-sm font-medium text-green-800 dark:text-green-300">{it.correctedText}</p>
                  <CopyButton text={it.correctedText} label="" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{it.note}</p>
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" className="self-start" onClick={openReport}><Printer className="size-4" /> {t(language, "openReport")}</Button>
        </CardContent>
      </Card>
    );
  }

  // Inspector (or any role once results exist): printable report.
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Printer className="size-4 text-primary" /> {t(language, "report")}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">A print-friendly report with the label photo, every rule result, timestamp and disclaimer. Use your browser&apos;s Save as PDF.</p>
        <Button onClick={openReport} className="self-start"><Printer className="size-4" /> {t(language, "openReport")}</Button>
      </CardContent>
    </Card>
  );
}
