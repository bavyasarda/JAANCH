import { NextRequest } from "next/server";
import { runJaanch } from "@/lib/agent/run";
import { renderMarkdown } from "@/lib/agent/markdown";
import type { RunInput, RunState, StreamEvent } from "@/lib/agent/context";
import type { AgentStep } from "@/lib/types";
import { LANGUAGES, ROLES, SAMPLE_LABELS } from "@/lib/constants";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Method 2 (hosted API) endpoint. Non-streaming JSON in, JSON out.
 * POST body (all optional except one input source):
 *   { "sample": "05-nonstandard-units.png" | "5", "image_url": "https://...", "image_base64": "...", "media_type": "image/jpeg",
 *     "listing_text": "...", "url": "https://...", "role": "consumer|seller|inspector", "language": "hi-IN|en-IN|ta-IN|bn-IN|mr-IN|te-IN", "question": "..." }
 * Response: { "format": "markdown", "response": "<markdown>", "verdict", "data": {...}, "trace": [...] }
 */
const INFO = {
  name: "jaanch",
  displayName: "Jaanch · जाँच — Legal Metrology label checker",
  version: "1.0.0",
  description: "Agentic checker for packaged-product labels against India's Legal Metrology (Packaged Commodities) Rules, 2011. Explains the verdict in Indian languages and drafts a grievance (consumer), fix-list (seller) or compliance report (inspector).",
  endpoint: { method: "POST", path: "/api/agent" },
  inputs: {
    sample: { type: "string", description: "Bundled test label (file name or 1-10)", options: SAMPLE_LABELS.map((s, i) => `${i + 1}: ${s.file} — ${s.title}`) },
    image_url: { type: "string", description: "Public URL of a label photo (JPEG/PNG/WebP, ≤ 3 MB)" },
    image_base64: { type: "string", description: "Base64 label photo (no data: prefix); set media_type" },
    listing_text: { type: "string", description: "Pasted e-commerce listing text" },
    url: { type: "string", description: "Product page URL (many marketplaces block scraping; use listing_text)" },
    role: { type: "string", options: ROLES.map((r) => r.value), default: "consumer" },
    language: { type: "string", options: LANGUAGES.map((l) => l.value), default: "hi-IN" },
    question: { type: "string", description: "Optional question answered in the verdict" },
  },
  output: { format: "markdown", fields: ["response", "verdict", "data", "trace"] },
  docs: "https://github.com/bavyasarda/JAANCH/blob/main/docs/API.md",
};

export async function GET() {
  return Response.json({ status: "ok", ...INFO });
}

async function loadSample(ref: string): Promise<{ base64: string; mediaType: string } | null> {
  const idx = Number(ref);
  const file = Number.isInteger(idx) && idx >= 1 && idx <= SAMPLE_LABELS.length ? SAMPLE_LABELS[idx - 1].file : SAMPLE_LABELS.find((s) => s.file === ref || s.title.toLowerCase() === ref.toLowerCase())?.file;
  if (!file) return null;
  const buf = await readFile(path.join(process.cwd(), "public", "test-labels", file));
  return { base64: buf.toString("base64"), mediaType: "image/png" };
}

async function fetchImage(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url, { headers: { "User-Agent": "Jaanch/1.0" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Image URL returned HTTP ${res.status}`);
  const mediaType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) throw new Error("Image larger than 4 MB; please resize it");
  return { base64: buf.toString("base64"), mediaType };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const str = (k: string) => (typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string).trim() : undefined);
  const role = (ROLES.some((r) => r.value === str("role")) ? str("role") : "consumer") as RunInput["role"];
  const language = (LANGUAGES.some((l) => l.value === str("language")) ? str("language") : "hi-IN") as RunInput["language"];

  let image: { base64: string; mediaType: string } | undefined;
  let sampleFile: string | undefined;
  try {
    const sample = str("sample");
    if (sample) {
      const s = await loadSample(sample);
      if (!s) return Response.json({ error: `Unknown sample '${sample}'. Use 1-10 or a file name from GET /api/agent.` }, { status: 400 });
      image = s;
      sampleFile = Number.isInteger(Number(sample)) ? SAMPLE_LABELS[Number(sample) - 1].file : sample;
    } else if (str("image_base64")) {
      image = { base64: str("image_base64")!, mediaType: str("media_type") ?? "image/jpeg" };
    } else if (str("image_url")) {
      image = await fetchImage(str("image_url")!);
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not load image" }, { status: 400 });
  }
  const input: RunInput = { imageBase64: image?.base64, mediaType: image?.mediaType, listingText: str("listing_text"), url: str("url"), role, language, question: str("question"), sampleFile };
  if (!input.imageBase64 && !input.listingText && !input.url) {
    return Response.json({ error: "Provide one of: sample, image_url, image_base64, listing_text, url" }, { status: 400 });
  }

  const steps: AgentStep[] = [];
  let state: RunState = {};
  let summary = "";
  let planner: "llm" | "scripted" = "llm";
  let error: string | undefined;
  const t0 = Date.now();
  await runJaanch(input, (ev: StreamEvent) => {
    if (ev.type === "step") {
      const i = steps.findIndex((s) => s.id === ev.step.id);
      if (i >= 0) steps[i] = ev.step;
      else steps.push(ev.step);
    } else if (ev.type === "state") state = { ...state, ...ev.patch };
    else if (ev.type === "final") {
      state = ev.state;
      summary = ev.summary;
      planner = ev.planner;
    } else if (ev.type === "error") error = ev.message;
  });

  const markdown = renderMarkdown(state, steps, role, language, error ?? summary);
  const rules = state.rules;
  return Response.json(
    {
      format: "markdown",
      response: markdown,
      ok: !error,
      error,
      verdict: rules?.verdict ?? null,
      summary: state.verdictText?.english ?? summary,
      data: {
        role,
        language,
        planner,
        verdictText: state.verdictText ?? null,
        counts: rules?.counts ?? null,
        results: rules?.results ?? [],
        notApplicable: rules?.notApplicable ?? [],
        declarations: state.label ?? state.listing ?? null,
        compare: state.compare ?? null,
        grievance: state.grievance ?? null,
        fixList: state.fixList ?? null,
        warnings: state.warnings ?? [],
        models: state.models ?? null,
      },
      trace: steps.map((s) => ({ tool: s.tool, why: s.why, summary: s.summary, status: s.status, durationMs: s.durationMs ?? 0 })),
      elapsedMs: Date.now() - t0,
      disclaimer: "Jaanch is an assistive tool, not an official Legal Metrology finding.",
    },
    { status: error && !rules ? 502 : 200 },
  );
}
