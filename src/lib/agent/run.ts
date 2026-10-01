import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { textModel, fallbackTextModel, withFallback, groqTextOptions, MODEL_IDS, friendlyModelError, isQuotaError } from "@/lib/ai";
import { extractLabel } from "@/lib/tools/extract-label";
import { checkRules } from "@/lib/tools/check-rules";
import { explainVerdict, verdictFacts } from "@/lib/tools/explain-verdict";
import { draftGrievance } from "@/lib/tools/draft-grievance";
import { makeFixList } from "@/lib/tools/make-fix-list";
import { scrapeListing } from "@/lib/tools/scrape-listing";
import { parseListingText } from "@/lib/tools/parse-listing";
import { compareLabelListing } from "@/lib/tools/compare-label-listing";
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

/** Steps that must be finished before the verdict / role action can be produced. */
function pendingPrereq(ctx: RunContext): string | null {
  if (ctx.input.imageBase64 && !ctx.state.label) return "Call extractLabel first.";
  if (ctx.input.url && !ctx.state.listing && !ctx.state.listingError) return "Call scrapeListing first.";
  if (ctx.input.listingText && !ctx.state.listing) return "Call parseListingText first.";
  if (!ctx.state.rules) return "Call checkRules first.";
  if (ctx.state.label && ctx.state.listing && !ctx.state.compare) return "Call compareLabelListing first so mismatches are included.";
  return null;
}

/** Plain actions shared by the LLM-planned tools and the scripted fallback. They read/write the run context so the planner never echoes large JSON. */
function makeActions(ctx: RunContext) {
  return {
    async extractLabel(why: string) {
      if (!ctx.input.imageBase64) return { error: "No image was uploaded." };
      if (ctx.state.label) return { note: "Label already extracted.", summary: labelSummary(ctx.state.label) };
      if (ctx.state.extractError) return { error: ctx.state.extractError, hint: "Do not retry; continue with other inputs or finish." };
      let out;
      try {
        out = await ctx.record("extractLabel", why, () => extractLabel({ imageBase64: ctx.input.imageBase64!, mediaType: ctx.input.mediaType ?? "image/jpeg" }), (o) => labelSummary(o.declarations));
      } catch (e) {
        const friendly = friendlyModelError(e);
        ctx.patch({ extractError: friendly });
        return { error: friendly, hint: "Do not retry; continue with other inputs or finish." };
      }
      if (out.warnings.length) ctx.patch({ warnings: [...(ctx.state.warnings ?? []), ...out.warnings] });
      ctx.patch({ label: out.declarations });
      return { summary: labelSummary(out.declarations), warnings: out.warnings, productName: out.declarations.productName, isImported: out.declarations.isImported };
    },
    async checkRules(why: string, source: "label" | "listing") {
      const decl = source === "listing" ? ctx.state.listing : ctx.state.label;
      if (!decl) return { error: `No ${source} declarations available yet. Call extractLabel first.` };
      const out = await ctx.record("checkRules", why, async () => checkRules(decl), rulesSummary);
      if (source === "listing") ctx.patch(ctx.state.label ? { listingRules: out } : { listingRules: out, rules: out, rulesSource: "listing" });
      else ctx.patch({ rules: out, rulesSource: "label" });
      return {
        verdict: out.verdict,
        violations: out.results.filter((r) => r.status === "FAIL" || r.status === "MISSING").map((r) => ({ id: r.ruleId, title: r.title, status: r.status })),
        needsReview: out.results.filter((r) => r.status === "NEEDS_REVIEW").map((r) => r.title),
        passed: out.counts.PASS,
      };
    },
    async explainVerdict(why: string) {
      const pre = pendingPrereq(ctx);
      const rules = ctx.state.rules;
      if (pre || !rules) return { error: pre ?? "Call checkRules first." };
      const facts = verdictFacts(rules, ctx.state.compare, ctx.state.label?.productName);
      const out = await ctx.record("explainVerdict", why, () => explainVerdict({ facts, language: ctx.input.language, question: ctx.input.question }), (o) => `Verdict explained in ${languageName(o.language)} (${o.text.length} chars).`);
      ctx.patch({ verdictText: out });
      return { done: true, english: out.english };
    },
    async draftGrievance(why: string) {
      const pre = pendingPrereq(ctx);
      const rules = ctx.state.rules;
      if (pre || !rules) return { error: pre ?? "Call checkRules first." };
      const out = await ctx.record("draftGrievance", why, () => draftGrievance({ label: ctx.state.label, rules, compare: ctx.state.compare, listingUrl: ctx.input.url, language: ctx.input.language }), (o) => `Grievance drafted in ${languageName(o.language)} + English (${o.text.length} chars).`);
      ctx.patch({ grievance: out });
      return { done: true, subject: out.subject };
    },
    async makeFixList(why: string) {
      const pre = pendingPrereq(ctx);
      const rules = ctx.state.rules;
      if (pre || !rules) return { error: pre ?? "Call checkRules first." };
      const out = await ctx.record("makeFixList", why, () => makeFixList({ label: ctx.state.label, rules, language: ctx.input.language }), (o) => `${o.items.length} correction(s) listed for the seller.`);
      ctx.patch({ fixList: out });
      return { done: true, corrections: out.items.length };
    },
    async scrapeListing(why: string) {
      if (!ctx.input.url) return { error: "No product link was given." };
      if (ctx.state.listing) return { note: "Listing already parsed." };
      const url = ctx.input.url;
      const res = await ctx.record("scrapeListing", why, () => scrapeListing(url), (r) => (r.ok ? `Fetched "${r.title ?? url}" — ${r.text?.split("\n").length ?? 0} candidate lines.` : `Blocked / failed: ${r.error}`));
      if (!res.ok) {
        ctx.patch({ listingError: res.error });
        return { error: res.error, hint: ctx.input.listingText ? "Pasted listing text is available: call parseListingText." : "Ask the user to paste the listing text; continue with the label if there is one." };
      }
      const parsed = await ctx.record("parseListingText", "Structure the scraped listing lines into declarations.", () => parseListingText(res.text!), (o) => labelSummary(o.declarations));
      ctx.patch({ listing: parsed.declarations });
      return { summary: labelSummary(parsed.declarations) };
    },
    async parseListingText(why: string) {
      if (!ctx.input.listingText) return { error: "No pasted listing text." };
      if (ctx.state.listing) return { note: "Listing already parsed." };
      const text = ctx.input.listingText;
      const parsed = await ctx.record("parseListingText", why, () => parseListingText(text), (o) => labelSummary(o.declarations));
      ctx.patch({ listing: parsed.declarations, listingError: undefined });
      return { summary: labelSummary(parsed.declarations) };
    },
    async compareLabelListing(why: string) {
      if (!ctx.state.label || !ctx.state.listing) return { error: "Need both label and listing declarations to compare." };
      const label = ctx.state.label, listing = ctx.state.listing;
      const out = await ctx.record("compareLabelListing", why, async () => compareLabelListing(label, listing), (o) => (o.mismatches.length ? `${o.mismatches.length} mismatch(es): ${o.mismatches.map((m) => m.field).join(", ")}.` : `No mismatches across ${o.compared.join(", ") || "comparable fields"}.`));
      ctx.patch({ compare: out });
      return { mismatches: out.mismatches.map((m) => ({ field: m.field, label: m.label, listing: m.listing })) };
    },
    async prepareReport(why: string) {
      const pre = pendingPrereq(ctx);
      if (pre) return { error: pre };
      await ctx.record("prepareReport", why, async () => true, () => "Compliance report assembled; open it from the action panel and save as PDF.");
      ctx.patch({ reportReady: true });
      return { done: true };
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
      description: "Write the plain-language verdict for the user in their chosen language (plus English). Call after checkRules.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.explainVerdict(why),
    }),
    scrapeListing: tool({
      description: "Fetch the product link and extract listing details (title, price, net quantity, manufacturer, origin). Call when a product link is given. If it reports an error, do not retry.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.scrapeListing(why),
    }),
    parseListingText: tool({
      description: "Structure pasted listing text into declarations. Call when pasted listing text is given (or when scraping failed and pasted text exists).",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.parseListingText(why),
    }),
    compareLabelListing: tool({
      description: "Compare the label and the listing for MRP, net quantity, manufacturer and country-of-origin mismatches. Call only when both a label and a listing have been extracted.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.compareLabelListing(why),
    }),
    draftGrievance: tool({
      description: "CONSUMER role action: draft a complaint for the National Consumer Helpline in the user's language plus English. Call after checkRules when the role is consumer.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.draftGrievance(why),
    }),
    makeFixList: tool({
      description: "SELLER role action: produce corrected label text for every failing rule. Call after checkRules when the role is seller.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.makeFixList(why),
    }),
    prepareReport: tool({
      description: "INSPECTOR role action: assemble the printable compliance report. Call after checkRules when the role is inspector.",
      inputSchema: z.object({ reason }),
      execute: ({ reason: why }) => a.prepareReport(why),
    }),
  };
}

const ROLE_ACTION: Record<string, "draftGrievance" | "makeFixList" | "prepareReport"> = { consumer: "draftGrievance", seller: "makeFixList", inspector: "prepareReport" };

function systemPrompt(input: RunInput): string {
  const role = ROLES.find((r) => r.value === input.role);
  return `You are Jaanch, an agent that checks Indian packaged-product labels against the Legal Metrology (Packaged Commodities) Rules, 2011.
You plan and call tools; you never decide compliance yourself — only the checkRules tool does. Do not invent legal clauses.
Inputs available: image=${input.imageBase64 ? "yes" : "no"}, productLink=${input.url ? "yes" : "no"}, pastedListing=${input.listingText ? "yes" : "no"}. User role: ${role?.label ?? input.role}. Language: ${languageName(input.language)}.${input.question ? ` User's question: "${input.question}"` : ""}
Plan: 1) extractLabel if an image exists. 1b) scrapeListing if a product link exists; parseListingText if pasted listing text exists (or scraping failed and pasted text exists). 2) checkRules (source "label" if an image exists, else "listing"). 2b) compareLabelListing if BOTH label and listing were extracted. 3) explainVerdict. 4) The role action: ${ROLE_ACTION[input.role] ?? "draftGrievance"} (every run must end with the action for the user's role, even when compliant; it must be the LAST tool call). Then reply with ONE short English sentence summarising the outcome for the user (no markdown). Call one tool at a time. Give a one-line reason with every call.`;
}

/** Deterministic pipeline used when the LLM planner is unavailable (rate limit / outage) or skipped a required step. */
async function runScripted(ctx: RunContext, a: Actions, note: string) {
  if (ctx.input.imageBase64 && !ctx.state.label && !ctx.state.extractError) await a.extractLabel(`${note}: read the label first.`);
  if (ctx.input.url && !ctx.state.listing && !ctx.state.listingError) await a.scrapeListing(`${note}: fetch the product listing.`);
  if (ctx.input.listingText && !ctx.state.listing) await a.parseListingText(`${note}: structure the pasted listing text.`);
  if (ctx.state.label && !ctx.state.rules) await a.checkRules(`${note}: run the deterministic rule engine.`, "label");
  if (!ctx.state.label && ctx.state.listing && !ctx.state.rules) await a.checkRules(`${note}: no photo, so check the listing declarations.`, "listing");
  if (ctx.state.label && ctx.state.listing && !ctx.state.compare) await a.compareLabelListing(`${note}: compare the pack with the listing.`);
  if (ctx.state.rules && !ctx.state.verdictText) await a.explainVerdict(`${note}: explain the verdict in ${languageName(ctx.input.language)}.`);
  if (ctx.state.rules) {
    const action = ROLE_ACTION[ctx.input.role] ?? "draftGrievance";
    if (action === "draftGrievance" && !ctx.state.grievance) await a.draftGrievance(`${note}: the user is a consumer, so draft the helpline grievance.`);
    if (action === "makeFixList" && !ctx.state.fixList) await a.makeFixList(`${note}: the user is a seller, so list the label corrections.`);
    if (action === "prepareReport" && !ctx.state.reportReady) await a.prepareReport(`${note}: the user is an inspector, so prepare the report.`);
  }
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
    const { result, provider } = await withFallback(textModel(), fallbackTextModel(), (model) =>
      generateText({
        model,
        system: systemPrompt(input),
        prompt: "Start the check now.",
        tools,
        stopWhen: stepCountIs(10),
        maxRetries: 2,
        temperature: 0,
        maxOutputTokens: 600,
        providerOptions: groqTextOptions,
      }),
    );
    if (provider === "fallback") ctx.patch({ warnings: [...(ctx.state.warnings ?? []), "Groq planner was unavailable; used the fallback provider."] });
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
    emit({ type: "error", message: ctx.state.extractError ?? (ctx.input.imageBase64 ? "Could not read the label. Try a clearer, well-lit photo of the back of the pack." : ctx.state.listingError ?? "Could not get any declarations from the listing. Paste the listing text or upload a label photo.") });
    return;
  }
  void isQuotaError;
  if (!summary) summary = ctx.state.verdictText?.english ?? rulesSummary(ctx.state.rules);
  emit({ type: "final", summary, state: ctx.state, steps: ctx.steps, planner });
}
