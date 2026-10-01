# Jaanch — 3-minute demo script

**Setup (before judges arrive):** open https://jaanch-delta.vercel.app on a laptop *and* on a phone (Add to Home Screen — it installs as an app). Check the Groq quota: run one sample. If it fails with a quota message, the bundled samples still work through the cached-extraction fallback (the timeline says "cached" honestly), but set `FALLBACK_API_KEY` or upgrade Groq for a fully live demo.

## 0:00 — The problem (20 s)
"Every packet in India must carry seven declarations under the Legal Metrology rules. Shoppers can't tell, MSMEs get fined for mistakes they never noticed, inspectors check by hand — and the rules are English legalese. Jaanch reads the packet and answers in your language."

## 0:20 — Consumer flow (60 s)
1. Language → **हिन्दी**, role → **Consumer**. "Try a sample" → **5. Net quantity in non-standard units**.
2. Press **Jaanch karo**. Point at the **Agent steps** timeline as it streams: the planner's *reason* for each call, then `extractLabel` (vision), `checkRules` (deterministic), `explainVerdict`, `draftGrievance`.
3. Verdict appears in Hindi — press **Listen** so the room hears it.
4. Open the grievance: Hindi tab + English tab, **Copy** / **Share on WhatsApp**.
   Line: "The LLM never decided anything here. Pass/fail came from a TypeScript rule engine over a JSON file that cites the clause — see the Rules page."

## 1:20 — Seller flow (40 s)
Role → **Seller**, sample **3. MRP without 'inclusive of all taxes'**. Show the fix-list: exact corrected text `MRP ₹ 48.00 (inclusive of all taxes)`, copy button. "An MSME fixes the artwork before the next print run instead of after a fine."

## 2:00 — Listing mismatch (30 s)
Keep sample 1 (compliant), click **Paste listing text instead**, paste:
```
Sunrise Valley Classic Thick Poha 500g | M.R.P.: ₹ 89 | Item Weight: 450 Grams | Country of Origin: India
```
Run. The pack is compliant but the **Label vs online listing** card shows price above MRP and a quantity mismatch — and the grievance now includes them. "Amazon and Flipkart block scrapers, so the paste fallback is the honest path."

## 2:30 — Inspector + transparency (30 s)
Role → **Inspector**, any sample → **Open report** → **Save as PDF** (Devanagari renders correctly because it's HTML, not pdf-lib). Then open **/rules**: every rule with its clause, source PDF link and `verified: false` badge. "Our team verifies each clause against the gazette before anyone relies on it."

## Judge Q&A ammo
- **Is it an agent or a chatbot?** Multi-step tool calling with the Vercel AI SDK; the planner chooses tools and must justify each call; a scripted fallback keeps the demo alive if the planner model is down. Timeline shows timings.
- **Hallucinated law?** Impossible by construction: the model only extracts, plans, explains and drafts. `rules.json` has 12 rules, each with a source; 11 unit tests pin the engine's behaviour (`npm test`).
- **Open source?** MIT. Only open-weight models (Qwen 3.8 27B, gpt-oss-120b/20b) on Groq, switchable by env to OpenRouter / HF.
- **Why not OCR + regex?** Labels come in every Indian script and layout; the vision model handles Devanagari/Tamil/Bengali and returns bounding boxes we use for a deterministic text-size estimate.
- **Scale?** Serverless on Vercel, no DB, client-side image compression, ~10 s per check, ~4K tokens per check.
- **What's next?** Verified rule set with the Legal Metrology department, shelf-scan mode for inspectors (multi-pack), FSSAI/BIS rule packs as additional JSON files — the engine is rule-pack agnostic.
