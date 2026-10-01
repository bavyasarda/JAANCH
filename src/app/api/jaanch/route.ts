import { NextRequest } from "next/server";
import { runJaanch } from "@/lib/agent/run";
import type { RunInput, StreamEvent } from "@/lib/agent/context";
import { friendlyModelError } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let input: RunInput;
  try {
    input = (await req.json()) as RunInput;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (input.imageBase64 && input.imageBase64.length > 4.2 * 1024 * 1024) {
    return new Response("Image too large. Please use a smaller photo (under 3 MB).", { status: 413 });
  }
  if (!process.env.GROQ_API_KEY && (process.env.AI_PROVIDER ?? "groq") === "groq") {
    return new Response("Server is missing GROQ_API_KEY.", { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (ev: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        } catch {
          /* client went away */
        }
      };
      try {
        await runJaanch(input, emit);
      } catch (e) {
        emit({ type: "error", message: friendlyModelError(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
