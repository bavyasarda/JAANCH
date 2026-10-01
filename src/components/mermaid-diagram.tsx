"use client";
import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";

/** Renders a Mermaid definition to inline SVG in the browser (open-source mermaid.js). */
export function MermaidDiagram({ chart, className }: { chart: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: resolvedTheme === "dark" ? "dark" : "neutral", securityLevel: "strict", fontFamily: "Noto Sans, sans-serif" });
        const { svg } = await mermaid.render(`m${id}${resolvedTheme === "dark" ? "d" : "l"}`, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not render diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  if (err) return <pre className="overflow-auto rounded-lg border bg-muted p-3 text-xs">{chart}</pre>;
  if (!svg) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
