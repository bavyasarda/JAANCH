# aiKart listing sheet — copy-paste values for the Method 2 (API endpoint) submission

| Field | Value |
| --- | --- |
| Agent name | Jaanch · जाँच |
| Tagline | Packet ki jaanch, aapki bhasha mein. |
| Short description | An AI agent that checks packaged-product labels against India's Legal Metrology (Packaged Commodities) Rules, 2011, explains the verdict in six Indian languages by text and voice, and drafts the next step: a consumer helpline grievance, a seller fix-list or an inspector report. |
| Category | Citizen & GovTech |
| Secondary categories / industries | Consumer protection · Retail & e-commerce · FMCG manufacturing (MSME) · Regulatory & compliance · Bharat Languages |
| Pricing | Free (open source, MIT) |
| Team | Bavya Sarda |
| Repository | https://github.com/bavyasarda/JAANCH |
| Live app (tutorial / try it) | https://jaanch-delta.vercel.app |
| API endpoint | `POST https://jaanch-delta.vercel.app/api/agent` |
| API schema / health | `GET https://jaanch-delta.vercel.app/api/agent` |
| Authentication | None required |
| Request format | JSON — see sample below |
| Response format | JSON with `response` (markdown), `verdict`, `data`, `trace` |
| Supporting documentation | https://github.com/bavyasarda/JAANCH/blob/main/docs/API.md |
| Logo URL | https://jaanch-delta.vercel.app/icon-512.png |
| Cover image URL (1280×720) | https://jaanch-delta.vercel.app/cover.png |
| Tutorial / demo video URL | _(paste the uploaded demo video link)_ |
| Agent manifest (if asked) | https://github.com/bavyasarda/JAANCH/blob/main/aikart-manifest.yaml |

## Long description

Every pre-packaged product sold in India must carry mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011: the maker's name and address, generic name, net quantity in standard units, month and year of packing, MRP inclusive of all taxes, consumer-care contact details and, for imports, the country of origin. Shoppers can't check them, MSME sellers get penalised for mistakes they never noticed, and inspectors check packs by hand.

Jaanch is an agent, not a chatbot. A planner model (open-weight gpt-oss-120b on Groq) decides which tools to call and justifies every call; a vision model (Qwen 3.8 27B) reads the label in any Indian script; a deterministic TypeScript rule engine over a transparent, source-cited rule set decides PASS / FAIL / MISSING / NEEDS_REVIEW; the agent compares the pack with an online listing, explains the verdict in Hindi, Tamil, Bengali, Marathi, Telugu or English (spoken aloud on request), and ends with the action for the user's role: a National Consumer Helpline grievance (consumer), corrected label text (seller) or a printable compliance report (inspector). The LLM never decides compliance.

Open source (MIT), open-weight models only, no database, installable as a PWA, hosted API with no authentication.

## Sample request

```json
{ "sample": "5", "role": "consumer", "language": "hi-IN" }
```

Other inputs: `image_url`, `image_base64` (+ `media_type`), `listing_text`, `url`, `question`. Roles: `consumer | seller | inspector`. Languages: `hi-IN | en-IN | ta-IN | bn-IN | mr-IN | te-IN`.

## Sample response (abridged)

```json
{
  "format": "markdown",
  "response": "# Jaanch · जाँच — Label check for **Danish Butter Cookies** ...",
  "ok": true,
  "verdict": "VIOLATIONS",
  "summary": "The label uses 'oz', which is not a standard unit under Rule 13 ...",
  "data": { "counts": { "PASS": 10, "FAIL": 1, "MISSING": 0, "NEEDS_REVIEW": 0 }, "results": [ "..." ], "grievance": { "subject": "...", "text": "...", "english": "..." } },
  "trace": [ { "tool": "extractLabel", "why": "...", "summary": "...", "durationMs": 3100 } ],
  "elapsedMs": 9800
}
```

## Test it in one line

```bash
curl -s https://jaanch-delta.vercel.app/api/agent -H "Content-Type: application/json" -d '{"sample":"5","role":"consumer","language":"hi-IN"}'
```
