/**
 * aiKart "Try Me Now" sandbox runner (Method 1).
 * Reads /aikart/input.json (or the AIKART_INPUT env var, or ./input.json), runs the Jaanch agent and
 * writes /aikart/output.json as {"format":"markdown","response":"..."} (also ./output.json locally).
 *
 * Runs the agent in-process when GROQ_API_KEY is set; otherwise delegates to the hosted Jaanch API
 * (JAANCH_API_URL, default https://jaanch-delta.vercel.app/api/agent) so the public image needs no secrets.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Input = Record<string, unknown>;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SAMPLES = ["01-compliant-en.png", "02-missing-mrp.png", "03-mrp-no-taxes.png", "04-missing-care.png", "05-nonstandard-units.png", "06-missing-address.png", "07-missing-date.png", "08-import-no-origin.png", "09-tiny-text.png", "10-compliant-hi.png"];
const LANG: Record<string, string> = { hindi: "hi-IN", english: "en-IN", tamil: "ta-IN", bengali: "bn-IN", marathi: "mr-IN", telugu: "te-IN" };

function readInput(): Input {
  for (const p of ["/aikart/input.json", path.join(process.cwd(), "input.json")]) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf8"));
      } catch (e) {
        console.error(`[sandbox] could not parse ${p}:`, e);
      }
    }
  }
  if (process.env.AIKART_INPUT?.trim()) {
    try {
      return JSON.parse(process.env.AIKART_INPUT);
    } catch {
      return { listing_text: process.env.AIKART_INPUT };
    }
  }
  return {};
}

function normalise(raw: Input) {
  const s = (k: string) => (typeof raw[k] === "string" && (raw[k] as string).trim() ? (raw[k] as string).trim() : undefined);
  const sampleRaw = s("sample") ?? s("sample_label");
  let sample: string | undefined;
  if (sampleRaw && !/^none/i.test(sampleRaw)) {
    const m = sampleRaw.match(/^(\d{1,2})/);
    sample = m ? SAMPLES[Number(m[1]) - 1] : SAMPLES.find((f) => sampleRaw.includes(f));
  }
  const langRaw = (s("language") ?? "hindi").toLowerCase();
  const language = Object.entries(LANG).find(([k]) => langRaw.includes(k))?.[1] ?? (/-IN$/.test(langRaw) ? langRaw : "hi-IN");
  const roleRaw = (s("role") ?? "consumer").toLowerCase();
  const role = roleRaw.includes("sell") ? "seller" : roleRaw.includes("inspect") ? "inspector" : "consumer";
  return { sample, image_url: s("image_url"), listing_text: s("listing_text"), url: s("product_url") ?? s("url"), role, language, question: s("question") };
}

function writeOutput(markdown: string, extra: Record<string, unknown> = {}) {
  const out = JSON.stringify({ format: "markdown", response: markdown, ...extra }, null, 2);
  for (const p of ["/aikart/output.json", path.join(process.cwd(), "output.json")]) {
    try {
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, out);
      console.error(`[sandbox] wrote ${p}`);
    } catch {
      /* /aikart may not exist locally */
    }
  }
  console.log(markdown);
}

async function viaHostedApi(input: ReturnType<typeof normalise>) {
  const url = process.env.JAANCH_API_URL ?? "https://jaanch-delta.vercel.app/api/agent";
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(110000) });
  const json = (await res.json()) as { response?: string; error?: string; verdict?: string; data?: unknown; trace?: unknown };
  if (!json.response) throw new Error(json.error ?? `Hosted API returned HTTP ${res.status}`);
  return json;
}

async function inProcess(input: ReturnType<typeof normalise>) {
  const { runJaanch } = await import("../src/lib/agent/run");
  const { renderMarkdown } = await import("../src/lib/agent/markdown");
  let imageBase64: string | undefined, mediaType: string | undefined;
  if (input.sample) {
    imageBase64 = readFileSync(path.join(ROOT, "public", "test-labels", input.sample)).toString("base64");
    mediaType = "image/png";
  } else if (input.image_url) {
    const r = await fetch(input.image_url, { signal: AbortSignal.timeout(15000) });
    imageBase64 = Buffer.from(await r.arrayBuffer()).toString("base64");
    mediaType = r.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  }
  const steps: import("../src/lib/types").AgentStep[] = [];
  let state: import("../src/lib/agent/context").RunState = {};
  let summary = "", error: string | undefined;
  await runJaanch({ imageBase64, mediaType, listingText: input.listing_text, url: input.url, role: input.role as "consumer", language: input.language as "hi-IN", question: input.question, sampleFile: input.sample }, (ev) => {
    if (ev.type === "step") { const i = steps.findIndex((s) => s.id === ev.step.id); if (i >= 0) steps[i] = ev.step; else steps.push(ev.step); }
    else if (ev.type === "state") state = { ...state, ...ev.patch };
    else if (ev.type === "final") { state = ev.state; summary = ev.summary; }
    else if (ev.type === "error") error = ev.message;
  });
  return { response: renderMarkdown(state, steps, input.role, input.language, error ?? summary), verdict: state.rules?.verdict ?? null, trace: steps };
}

async function main() {
  const input = normalise(readInput());
  if (!input.sample && !input.image_url && !input.listing_text && !input.url) {
    input.sample = SAMPLES[4];
    console.error("[sandbox] no input given; using bundled sample 5");
  }
  console.error("[sandbox] input:", JSON.stringify({ ...input }));
  try {
    const result = process.env.GROQ_API_KEY ? await inProcess(input) : await viaHostedApi(input);
    writeOutput(result.response!, { verdict: result.verdict ?? null, trace: result.trace ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeOutput(`# Jaanch — check could not be completed\n\n${msg}\n\n_Jaanch is an assistive tool, not an official Legal Metrology finding._`, { error: msg });
    process.exitCode = 1;
  }
}
main();
