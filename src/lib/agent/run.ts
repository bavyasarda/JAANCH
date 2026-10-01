import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { textModel, groqTextOptions, MODEL_IDS, friendlyModelError } from "@/lib/ai";
import { extractLabel } from "@/lib/tools/extract-label";
import { checkRules } from "@/lib/tools/check-rules";
import { explainVerdict, verdictFacts } from "@/lib/tools/explain-verdict";
import { languageName, ROLES } from "@/lib/constants";
import type { CheckRulesOutput, Declarations } from "@/lib/types";
import type { RunContext, RunInput, StreamEvent } from "./context";
import { createContext } from "./context";

const reason = z.string().describe("One short sentence: why you are calling this tool now.");

function rulesSummary(r: CheckRulesOutput): string {
  const bad = r.results.filter((x) => x.status === "FAIL" || x.status === "MISSING");
  const rev = r.results.filter((x) => x.status === "NEEDS_REVIEW");
  return `${r.verdict}: ${bad.length} violation(s)${bad.length ? " — " + bad.map((x) => x.title).join("; ") : ""}; ${rev.length} to review; ${r.counts.PASS} passed.`;
}

function labelSummary(d: Declarations): string {
  const bits = [d.productName && `product "${d.productName}"`, d.netQuantity?.raw && `qty "${d.netQuantity.raw}"`, d.mrp?.raw && `MRP "${d.mrp.raw}"`, d.languages?.length && `lang ${d.languages.join("/")}`].filter(Boolean);
  return `Read ${bits.length ? bits.join(", ") : "label"}; confidence ${Math.round((d.confidence ?? 0) * 100)}%.`;
}

/** Plain actions shared by the LLM-planned tools and the scripted fallback. They read/write the run context so the planner never echoes large JSON. */
function makeActions(ctx: RunContext) {
  return {
    async extractLabel(why: string) {
      if (!ctx.input.imageBase64) return { error: "No image was uploaded." };
      if (ctx.state.label) return { note: "Label already extracted.", summary: labelSummary(ctx.state.label) };
      const out = await ctx.record("extractLabel", why, () => extractLabel({ imageBase64: ctx.input.imageBase64!, mediaType: ctx.input.mediaType ?? "image/jpeg" }), (o) => labelSummary(o.declarations));
      ctx.patch({ label: out.declarations });
      return { summary: labelSummary(out.declarations), warnings: out.warnings, productName: out.declarations.productName, isImported: out.declarations.isImported };
    },
    async checkRules(why: string, source: "label" | "listing") {
      const decl = source === "listing" ? ctx.state.listing : ctx.state.label;
      if (!decl) return { error: `No ${source} declarations available yet. Call extractLabel first.` };
      const out = await ctx.record("checkRules", why, async () => checkRules(decl), rulesSummary);
      ctx.patch(source === "listing" ? { listingRules: out } : { rules: out });
      return {
        verdict: out.verdict,
        violations: out.results.filter((r) => r.status === "FAIL" || r.status === "MISSING").map((r) => ({ id: r.ruleId, title: r.title, status: r.status })),
        needsReview: out.results.filter((r) => r.status === "NEEDS_REVIEW").map((r) => r.title),
        passed: out.counts.PASS,
      };
    },
    async explainVerdict(why: string) {
      if (!ctx.state.rules) return { error: "Run checkRules first." };
      const facts = verdictFacts(ctx.state.rules, ctx.state.compare, ctx.state.label?.productName);
      const out = await ctx.record("explainVerdict", why, () => explainVerdict({ facts, language: ctx.input.language }), (o) => `Verdict explained in ${languageName(o.language)} (${o.text.length} chars).`);
      ctx.patch({ verdictText: out });
      return { done: true, english: out.english };
    },
  };
}
type Actions = ReturnType<typeof makeActions>;

function makeTools(a: Actions) {
  return {
    extractLabel: tool({
      description: "Read every mandatory declaration from the uploaded label photo using the vision model. Call once when an image is available.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.extractLabel(why),
    }),
    checkRules: tool({
      description: "Run the deterministic Legal Metrology rule engine over the extracted declarations. Call after extractLabel. This is the ONLY source of pass/fail decisions.",
      inputSchema: z.object({ reason, source: z.enum(["label", "listing"]).default("label").describe("Which declarations to check.") }),
      execute: ({ reason: why, source }) => a.checkRules(why, source),
    }),
    explainVerdict: tool({
      description: "Write the plain-language verdict for the user in their chosen language (plus English). Call after checkRules, before finishing.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.explainVerdict(why),
    }),
  };
}

function systemPrompt(input: RunInput): string {
  const role = ROLES.find((r) => r.value === input.role);
  return `You are Jaanch, an agent that checks Indian packaged-product labels against the Legal Metrology (Packaged Commodities) Rules, 2011.
You plan and call tools; you never decide compliance yourself — only the checkRules tool does. Do not invent legal clauses.
Inputs available: image=${input.imageBase64 ? "yes" : "no"}, productLink=${input.url ? "yes" : "no"}, pastedListing=${input.listingText ? "yes" : "no"}. User role: ${role?.label ?? input.role}. Language: ${languageName(input.language)}.${input.question ? ` User's question: "${input.question}"` : ""}
Plan: 1) extractLabel if an image exists. 2) checkRules. 3) explainVerdict. Then reply with ONE short English sentence summarising the outcome for the user (no markdown). Call one tool at a time. Give a one-line reason with every call.`;
}

/** Deterministic pipeline used when the LLM planner is unavailable (rate limit / outage) or skipped a required step. */
async function runScripted(ctx: RunContext, a: Actions, note: string) {
  if (ctx.input.imageBase64 && !ctx.state.label) await a.extractLabel(`${note}: read the label first.`);
  if (ctx.state.label && !ctx.state.rules) await a.checkRules(`${note}: run the deterministic rule engine.`, "label");
  if (ctx.state.rules && !ctx.state.verdictText) await a.explainVerdict(`${note}: explain the verdict in ${languageName(ctx.input.language)}.`);
}

export async function runJaanch(input: RunInput, emit: (ev: StreamEvent) => void): Promise<void> {
  const ctx = createContext(input, emit);
  ctx.patch({ models: { vision: MODEL_IDS.vision, text: MODEL_IDS.text, helper: MODEL_IDS.helper } });
  const actions = makeActions(ctx);
  const tools = makeTools(actions);
  let summary = "";
  let planner: "llm" | "scripted" = "llm";

  if (!input.imageBase64 && !input.url && !input.listingText) {
    emit({ type: "error", message: "Please upload a label photo, paste a product link, or paste the listing text." });
    return;
  }

  try {
    const planStep = ctx.record("plan", "Decide which tools to call for these inputs.", async () => MODEL_IDS.text, (m) => `Planner model ${m} is choosing tools.`);
    await planStep;
    const result = await generateText({
      model: textModel(),
      system: systemPrompt(input),
      prompt: "Start the check now.",
      tools,
      stopWhen: stepCountIs(7),
      temperature: 0,
      maxOutputTokens: 600,
      providerOptions: groqTextOptions,
    });
    summary = result.text.trim();
  } catch (e) {
    planner = "scripted";
    const msg = friendlyModelError(e);
    ctx.steps.push({ id: `fb-${Date.now().toString(36)}`, tool: "fallback", why: "The planner model was unavailable, so Jaanch switched to its built-in deterministic plan.", summary: msg, status: "done", startedAt: Date.now(), durationMs: 0 });
    emit({ type: "step", step: ctx.steps[ctx.steps.length - 1] });
  }

  // Safety net: make sure the required steps actually happened.
  try {
    const before = ctx.steps.length;
    await runScripted(ctx, actions, planner === "scripted" ? "Fallback plan" : "Planner skipped this step");
    void before;
  } catch (e) {
    emit({ type: "error", message: friendlyModelError(e) });
    return;
  }

  if (!ctx.state.rules) {
    emit({ type: "error", message: ctx.input.imageBase64 ? "Could not read the label. Try a clearer, well-lit photo of the back of the pack." : "Listing-only checks arrive in a later phase — please upload a label photo." });
    return;
  }
  if (!summary) summary = ctx.state.verdictText?.english ?? rulesSummary(ctx.state.rules);
  emit({ type: "final", summary, state: ctx.state, steps: ctx.steps, planner });
}
