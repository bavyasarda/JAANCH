import type { AgentStep, CheckRulesOutput, CompareOutput, Declarations } from "@/lib/types";
import type { LanguageCode, Role } from "@/lib/constants";

export interface RunInput {
  imageBase64?: string;
  mediaType?: string;
  url?: string;
  listingText?: string;
  role: Role;
  language: LanguageCode;
  question?: string;
}

export interface VerdictText {
  language: string;
  text: string;
  english: string;
}
export interface GrievanceDraft {
  language: string;
  text: string;
  english: string;
  subject: string;
}
export interface FixListItem {
  ruleId: string;
  title: string;
  currentText: string | null;
  correctedText: string;
  note: string;
}
export interface FixList {
  language: string;
  items: FixListItem[];
  summary: string;
}

export interface RunState {
  label?: Declarations;
  listing?: Declarations;
  listingError?: string;
  rules?: CheckRulesOutput;
  listingRules?: CheckRulesOutput;
  compare?: CompareOutput;
  verdictText?: VerdictText;
  grievance?: GrievanceDraft;
  fixList?: FixList;
  reportReady?: boolean;
  models?: { vision: string; text: string; helper: string };
}

export type StreamEvent =
  | { type: "step"; step: AgentStep }
  | { type: "state"; patch: Partial<RunState> }
  | { type: "final"; summary: string; state: RunState; steps: AgentStep[]; planner: "llm" | "scripted" }
  | { type: "error"; message: string };

export interface RunContext {
  input: RunInput;
  state: RunState;
  steps: AgentStep[];
  emit: (ev: StreamEvent) => void;
  /** Record a tool step: emits a running step, runs fn, emits the finished step. */
  record: <T>(tool: string, why: string, fn: () => Promise<T>, summarise: (out: T) => string) => Promise<T>;
  patch: (p: Partial<RunState>) => void;
}

let counter = 0;
export function createContext(input: RunInput, emit: (ev: StreamEvent) => void): RunContext {
  const ctx: RunContext = {
    input,
    state: {},
    steps: [],
    emit,
    patch(p) {
      Object.assign(ctx.state, p);
      emit({ type: "state", patch: p });
    },
    async record(tool, why, fn, summarise) {
      const step: AgentStep = { id: `s${++counter}-${Date.now().toString(36)}`, tool, why, summary: "", status: "running", startedAt: Date.now() };
      ctx.steps.push(step);
      emit({ type: "step", step: { ...step } });
      try {
        const out = await fn();
        step.status = "done";
        step.durationMs = Date.now() - step.startedAt;
        step.summary = summarise(out);
        emit({ type: "step", step: { ...step } });
        return out;
      } catch (e) {
        step.status = "error";
        step.durationMs = Date.now() - step.startedAt;
        step.summary = e instanceof Error ? e.message.slice(0, 200) : String(e);
        emit({ type: "step", step: { ...step } });
        throw e;
      }
    },
  };
  return ctx;
}
