import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Provider + model selection, all driven by environment variables.
 *   AI_PROVIDER=groq (default) | openrouter | hf | any OpenAI-compatible endpoint
 *   VISION_MODEL / TEXT_MODEL           — Groq model IDs (open-weight only)
 *   FALLBACK_BASE_URL / FALLBACK_API_KEY / FALLBACK_VISION_MODEL / FALLBACK_TEXT_MODEL
 */
const provider = (process.env.AI_PROVIDER ?? "groq").toLowerCase();

export const MODEL_IDS = {
  provider,
  vision: provider === "groq" ? process.env.VISION_MODEL ?? "qwen/qwen3.8-27b" : process.env.FALLBACK_VISION_MODEL ?? "qwen/qwen2.5-vl-72b-instruct",
  text: provider === "groq" ? process.env.TEXT_MODEL ?? "openai/gpt-oss-120b" : process.env.FALLBACK_TEXT_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
  /** Optional smaller model for drafting/translation so Groq's per-model rate limits are spread out. */
  helper: process.env.HELPER_MODEL || (provider === "groq" ? process.env.TEXT_MODEL ?? "openai/gpt-oss-120b" : process.env.FALLBACK_TEXT_MODEL ?? "meta-llama/llama-3.3-70b-instruct"),
};

function makeProvider() {
  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
    return createGroq({ apiKey: process.env.GROQ_API_KEY });
  }
  if (!process.env.FALLBACK_API_KEY) throw new Error("FALLBACK_API_KEY is not set for provider " + provider);
  return createOpenAICompatible({
    name: provider,
    baseURL: process.env.FALLBACK_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey: process.env.FALLBACK_API_KEY,
  });
}

let cached: ReturnType<typeof makeProvider> | null = null;
function p() {
  return (cached ??= makeProvider());
}

export function visionModel(): LanguageModel {
  return p()(MODEL_IDS.vision) as LanguageModel;
}
export function textModel(): LanguageModel {
  return p()(MODEL_IDS.text) as LanguageModel;
}
export function helperModel(): LanguageModel {
  return p()(MODEL_IDS.helper) as LanguageModel;
}

/** Groq-specific options that are harmless on other providers. */
export const groqTextOptions = provider === "groq" ? { groq: { reasoningFormat: "hidden" as const, reasoningEffort: "low" as const, parallelToolCalls: false } } : undefined;
export const groqVisionOptions = provider === "groq" ? { groq: { reasoningFormat: "hidden" as const, reasoningEffort: "none" as const } } : undefined;

/** Pull a JSON object out of a model reply that may include prose or code fences. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Friendly message for rate limits / model outages. */
export function friendlyModelError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|rate limit|too many requests/i.test(msg)) return "The model is busy right now (rate limit). Please wait a few seconds and try again.";
  if (/401|invalid api key|unauthor/i.test(msg)) return "The AI provider rejected the API key. Check GROQ_API_KEY in your environment.";
  if (/model.*(not found|does not exist|decommission)/i.test(msg)) return `The configured model is unavailable (${MODEL_IDS.vision} / ${MODEL_IDS.text}). Update VISION_MODEL / TEXT_MODEL.`;
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(msg)) return "The model took too long to respond. Please try again.";
  return "Something went wrong while talking to the model. Please try again.";
}
