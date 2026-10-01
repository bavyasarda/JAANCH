/**
 * Runs extractLabel (vision model) + checkRules (deterministic) over all 10 test labels
 * and prints a results table. Run: npm run verify
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { extractLabel } from "../src/lib/tools/extract-label";
import { checkRules } from "../src/lib/tools/check-rules";
import type { RuleStatus } from "../src/lib/types";

type Expect = { verdict: string; rule?: string; status?: RuleStatus };
const EXPECTED: Record<string, Expect> = {
  "01-compliant-en.png": { verdict: "COMPLIANT" },
  "02-missing-mrp.png": { verdict: "VIOLATIONS", rule: "LMPC-6-1-e-MRP", status: "MISSING" },
  "03-mrp-no-taxes.png": { verdict: "VIOLATIONS", rule: "LMPC-6-1-e-MRP-TAXES", status: "FAIL" },
  "04-missing-care.png": { verdict: "VIOLATIONS", rule: "LMPC-6-2-CONSUMER-CARE", status: "MISSING" },
  "05-nonstandard-units.png": { verdict: "VIOLATIONS", rule: "LMPC-13-STANDARD-UNITS", status: "FAIL" },
  "06-missing-address.png": { verdict: "VIOLATIONS", rule: "LMPC-6-1-a-ADDRESS", status: "MISSING" },
  "07-missing-date.png": { verdict: "VIOLATIONS", rule: "LMPC-6-1-d-DATE", status: "MISSING" },
  "08-import-no-origin.png": { verdict: "VIOLATIONS", rule: "LMPC-6-1-aa-ORIGIN", status: "MISSING" },
  "09-tiny-text.png": { verdict: "NEEDS_REVIEW", rule: "LMPC-7-2-TEXT-SIZE", status: "NEEDS_REVIEW" },
  "10-compliant-hi.png": { verdict: "COMPLIANT" },
};

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));

async function main() {
  const dir = join(process.cwd(), "public", "test-labels");
  const outDir = join(process.cwd(), "scripts", "out");
  mkdirSync(outDir, { recursive: true });
  const rows: string[] = [];
  let ok = 0;
  console.log(`\nJaanch verification — vision: ${process.env.VISION_MODEL}\n`);
  console.log(pad("#", 3) + pad("label", 26) + pad("verdict", 14) + pad("FAIL/MISSING", 44) + pad("NEEDS_REVIEW", 30) + "expected");
  console.log("-".repeat(140));
  for (const [file, exp] of Object.entries(EXPECTED)) {
    const t0 = Date.now();
    const imageBase64 = readFileSync(join(dir, file)).toString("base64");
    let line: string;
    try {
      const { declarations, warnings } = await extractLabel({ imageBase64, mediaType: "image/png" });
      const res = checkRules(declarations);
      writeFileSync(join(outDir, file.replace(".png", ".json")), JSON.stringify({ declarations, res, warnings }, null, 2));
      const bad = res.results.filter((r) => r.status === "FAIL" || r.status === "MISSING").map((r) => `${r.ruleId.replace("LMPC-", "")}:${r.status[0]}`);
      const rev = res.results.filter((r) => r.status === "NEEDS_REVIEW").map((r) => r.ruleId.replace("LMPC-", ""));
      const hit = res.verdict === exp.verdict && (!exp.rule || res.results.some((r) => r.ruleId === exp.rule && r.status === exp.status));
      if (hit) ok++;
      line = pad(file.slice(0, 2), 3) + pad(file, 26) + pad(res.verdict, 14) + pad(bad.join(" ") || "-", 44) + pad(rev.join(" ") || "-", 30) + (hit ? "✓" : `✗ want ${exp.verdict}${exp.rule ? " " + exp.rule + "=" + exp.status : ""}`) + `  (${((Date.now() - t0) / 1000).toFixed(1)}s)`;
    } catch (e) {
      line = pad(file.slice(0, 2), 3) + pad(file, 26) + "ERROR " + (e instanceof Error ? e.message.slice(0, 100) : String(e));
    }
    console.log(line);
    rows.push(line);
  }
  console.log("-".repeat(140));
  console.log(`${ok}/10 labels matched expectations. Per-label JSON written to scripts/out/`);
}
main();
