"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Link2, Mic, ClipboardPaste, Search, X, RotateCcw, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, ROLES, SAMPLE_LABELS, type LanguageCode, type Role } from "@/lib/constants";
import { compressImage, urlToFile } from "@/lib/image";
import { useJaanchRun } from "@/hooks/use-jaanch-run";
import { AgentSteps } from "@/components/agent-steps";
import { ResultsView } from "@/components/results-view";

interface Img { base64: string; mediaType: string; dataUrl: string; name: string }

export function JaanchForm() {
  const [role, setRole] = useState<Role>("consumer");
  const [language, setLanguage] = useState<LanguageCode>("hi-IN");
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [img, setImg] = useState<Img | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { result, run, reset } = useJaanchRun();

  async function loadFile(file: File) {
    setImgBusy(true);
    try {
      const c = await compressImage(file);
      setImg({ base64: c.base64, mediaType: c.mediaType, dataUrl: c.dataUrl, name: file.name });
    } finally {
      setImgBusy(false);
    }
  }
  async function loadSample(file: string) {
    setShowSamples(false);
    await loadFile(await urlToFile(`/test-labels/${file}`, file));
  }

  const canRun = !!img || url.trim().length > 0 || pasted.trim().length > 0;
  const running = result.status === "running";

  async function submit() {
    if (!canRun || running) return;
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    await run({ imageBase64: img?.base64, mediaType: img?.mediaType, url: url.trim() || undefined, listingText: pasted.trim() || undefined, role, language });
  }

  const doneSteps = result.steps.filter((s) => s.status === "done").length;
  const progress = running ? Math.min(90, 10 + doneSteps * 22) : result.status === "done" ? 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardContent className="flex flex-col gap-6 p-5 sm:p-7">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Label photo · लेबल की फ़ोटो</Label>
              <button type="button" onClick={() => setShowSamples((s) => !s)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Images className="size-3.5" /> Try a sample
              </button>
            </div>
            {showSamples && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-accent/40 p-2 sm:grid-cols-3">
                {SAMPLE_LABELS.map((s, i) => (
                  <button key={s.file} type="button" onClick={() => loadSample(s.file)} className="rounded-md border bg-background px-2 py-1.5 text-left text-xs hover:border-primary">
                    <span className="font-semibold text-primary">{i + 1}.</span> {s.title}
                  </button>
                ))}
              </div>
            )}
            {img ? (
              <div className="relative overflow-hidden rounded-xl border">
                <Image src={img.dataUrl} alt="Uploaded label" width={800} height={600} unoptimized className="max-h-72 w-full object-contain bg-muted" />
                <Button size="icon" variant="secondary" className="absolute right-2 top-2 size-8" onClick={() => setImg(null)} aria-label="Remove image"><X className="size-4" /></Button>
                <p className="truncate px-3 py-1.5 text-xs text-muted-foreground">{img.name}</p>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:border-primary hover:bg-accent/50">
                <Camera className="size-7 text-primary" />
                <span>{imgBusy ? "Compressing…" : "Tap to upload or take a photo of the back of the pack"}</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </label>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">Product link (optional) · प्रोडक्ट लिंक</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="url" className="pl-9" placeholder="https://www.example.in/product/..." value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
            </div>
            <button type="button" onClick={() => setShowPaste((v) => !v)} className="flex items-center gap-1 self-start text-xs text-primary underline-offset-2 hover:underline">
              <ClipboardPaste className="size-3.5" /> Paste listing text instead
            </button>
            {showPaste && <Textarea placeholder="Paste the product title, MRP, net quantity, manufacturer, country of origin…" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>I am a · मैं हूँ</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLES.find((r) => r.value === role)?.hint}</p>
            </div>
            <div className="grid gap-2">
              <Label>Language · भाषा</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label} · {l.english}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="lg" className="h-12 flex-1 text-base font-semibold" disabled={!canRun || running || imgBusy} onClick={submit}>
              <Search className="size-5" /> {running ? "Jaanch ho rahi hai…" : "Jaanch karo"}
            </Button>
            <Button size="lg" variant="outline" className="h-12" aria-label="Ask by voice" disabled title="Voice input arrives in Phase 5">
              <Mic className="size-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div ref={resultsRef} className="scroll-mt-20 flex flex-col gap-4">
        {running && (
          <div className="flex flex-col gap-2">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">Reading the label, running the rule engine, explaining in your language… this takes 15–60 seconds on the free model tier.</p>
          </div>
        )}
        {result.status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Could not complete the check</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{result.error}</span>
              <Button size="sm" variant="outline" className="self-start" onClick={submit}><RotateCcw className="size-4" /> Retry</Button>
            </AlertDescription>
          </Alert>
        )}
        {result.status === "done" && <ResultsView state={result.state} language={language} summary={result.summary} />}
        <AgentSteps steps={result.steps} running={running} />
        {result.status === "done" && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><RotateCcw className="size-4" /> Check another pack</Button>
          </div>
        )}
      </div>
    </div>
  );
}
