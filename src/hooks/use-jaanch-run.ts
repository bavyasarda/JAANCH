"use client";
import { useCallback, useRef, useState } from "react";
import type { AgentStep } from "@/lib/types";
import type { RunInput, RunState, StreamEvent } from "@/lib/agent/context";

export type RunStatus = "idle" | "running" | "done" | "error";

export interface RunResult {
  status: RunStatus;
  steps: AgentStep[];
  state: RunState;
  summary: string;
  planner?: "llm" | "scripted";
  error?: string;
}

const EMPTY: RunResult = { status: "idle", steps: [], state: {}, summary: "" };

export function useJaanchRun() {
  const [result, setResult] = useState<RunResult>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(EMPTY);
  }, []);

  const run = useCallback(async (input: RunInput) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setResult({ status: "running", steps: [], state: {}, summary: "" });

    try {
      const res = await fetch("/api/jaanch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const handle = (ev: StreamEvent) => {
        setResult((prev) => {
          if (ev.type === "step") {
            const steps = prev.steps.some((s) => s.id === ev.step.id) ? prev.steps.map((s) => (s.id === ev.step.id ? ev.step : s)) : [...prev.steps, ev.step];
            return { ...prev, steps };
          }
          if (ev.type === "state") return { ...prev, state: { ...prev.state, ...ev.patch } };
          if (ev.type === "final") return { ...prev, status: "done", summary: ev.summary, state: ev.state, steps: ev.steps, planner: ev.planner };
          if (ev.type === "error") return { ...prev, status: "error", error: ev.message };
          return prev;
        });
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            try {
              handle(JSON.parse(line) as StreamEvent);
            } catch {
              /* ignore malformed line */
            }
          }
        }
      }
      setResult((prev) => (prev.status === "running" ? { ...prev, status: "error", error: "The connection closed before the check finished. Please try again." } : prev));
    } catch (e) {
      if (ac.signal.aborted) return;
      setResult((prev) => ({ ...prev, status: "error", error: e instanceof Error ? e.message : "Something went wrong" }));
    }
  }, []);

  return { result, run, reset };
}
