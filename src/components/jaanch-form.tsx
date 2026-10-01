"use client";
import { useState } from "react";
import { Camera, Link2, Mic, ClipboardPaste, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, ROLES, type LanguageCode, type Role } from "@/lib/constants";

export function JaanchForm() {
  const [role, setRole] = useState<Role>("consumer");
  const [language, setLanguage] = useState<LanguageCode>("hi-IN");
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  return (
    <Card className="shadow-lg">
      <CardContent className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="grid gap-2">
          <Label>Label photo</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:border-primary hover:bg-accent/50">
            <Camera className="size-7 text-primary" />
            <span>Tap to upload or take a photo of the back of the pack</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" />
          </label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="url">Product link (optional)</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="url" className="pl-9" placeholder="https://www.example.in/product/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <button type="button" onClick={() => setShowPaste((v) => !v)} className="flex items-center gap-1 self-start text-xs text-primary underline-offset-2 hover:underline">
            <ClipboardPaste className="size-3.5" /> Paste listing text instead
          </button>
          {showPaste && (
            <Textarea placeholder="Paste the product title, MRP, net quantity, manufacturer, country of origin…" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>I am a</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLES.find((r) => r.value === role)?.hint}</p>
          </div>
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label} · {l.english}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="lg" className="h-12 flex-1 text-base font-semibold" disabled>
            <Search className="size-5" /> Jaanch karo
          </Button>
          <Button size="lg" variant="outline" className="h-12" aria-label="Ask by voice" disabled>
            <Mic className="size-5" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">Phase 1 shell — agent wiring arrives in the next phase.</p>
      </CardContent>
    </Card>
  );
}
