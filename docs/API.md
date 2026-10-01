# Jaanch hosted API (Submission Method 2)

Base URL: `https://jaanch-delta.vercel.app`

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/agent` | GET | Health + self-describing schema (inputs, options, sample list) |
| `/api/agent` | POST | Run the full agent once; JSON in, JSON out (non-streaming) |
| `/api/jaanch` | POST | Same agent, NDJSON event stream used by the web UI (steps, state patches, final) |

No authentication is required. Rate limits come from Groq's free tier (~8K tokens/min, ~200K tokens/day for the vision model); the response explains clearly when a limit is hit.

## POST /api/agent

Request body (JSON). Provide at least one input source: `sample`, `image_url`, `image_base64`, `listing_text` or `url`.

| Field | Type | Notes |
| --- | --- | --- |
| `sample` | string | Bundled test label: `"1"`…`"10"` or a file name such as `05-nonstandard-units.png` |
| `image_url` | string | Public URL of a label photo (JPEG/PNG/WebP, ≤ 4 MB) |
| `image_base64` | string | Base64 image without the `data:` prefix; set `media_type` (default `image/jpeg`) |
| `listing_text` | string | Pasted e-commerce listing text (title, MRP, net quantity, manufacturer, origin) |
| `url` | string | Product page URL. Most Indian marketplaces block server fetches; prefer `listing_text` |
| `role` | `consumer` \| `seller` \| `inspector` | Decides the final action (grievance / fix-list / report). Default `consumer` |
| `language` | `hi-IN` \| `en-IN` \| `ta-IN` \| `bn-IN` \| `mr-IN` \| `te-IN` | Verdict and draft language. Default `hi-IN` |
| `question` | string | Optional question answered inside the verdict |

### Example

```bash
curl -s https://jaanch-delta.vercel.app/api/agent \
  -H "Content-Type: application/json" \
  -d '{"sample":"5","role":"consumer","language":"hi-IN"}' | jq '{verdict, summary, trace}'
```

```bash
curl -s https://jaanch-delta.vercel.app/api/agent \
  -H "Content-Type: application/json" \
  -d '{"sample":"1","listing_text":"Sunrise Valley Classic Thick Poha 500g | M.R.P.: ₹ 89 | Item Weight: 450 Grams","role":"consumer","language":"en-IN"}' | jq '.data.compare'
```

### Response

```jsonc
{
  "format": "markdown",
  "response": "# Jaanch · जाँच — Label check for **Danish Butter Cookies** ...",   // full human-readable report
  "ok": true,
  "verdict": "VIOLATIONS",            // COMPLIANT | VIOLATIONS | NEEDS_REVIEW | null
  "summary": "The label uses 'oz' ...",
  "data": {
    "role": "consumer", "language": "hi-IN", "planner": "llm",
    "verdictText": { "language": "hi-IN", "text": "...", "english": "..." },
    "counts": { "PASS": 10, "FAIL": 1, "MISSING": 0, "NEEDS_REVIEW": 0 },
    "results": [ { "ruleId": "LMPC-13-STANDARD-UNITS", "status": "FAIL", "severity": "high", "reason": "...", "evidence": "Net Wt: 7 oz", "source": "LMPC Rules 2011, Rule 6(1)(c) read with Rule 13(2) and 13(3)", "verified": false } ],
    "notApplicable": [ ... ],
    "declarations": { ... },          // everything the vision model read
    "compare": { "mismatches": [ ... ], "compared": [ ... ] } ,
    "grievance": { "subject": "...", "text": "...", "english": "..." },   // consumer role
    "fixList": { "summary": "...", "items": [ ... ] },                    // seller role
    "warnings": [],
    "models": { "vision": "qwen/qwen3.8-27b", "text": "openai/gpt-oss-120b", "helper": "openai/gpt-oss-20b" }
  },
  "trace": [ { "tool": "extractLabel", "why": "...", "summary": "...", "status": "done", "durationMs": 3100 }, ... ],
  "elapsedMs": 9800,
  "disclaimer": "Jaanch is an assistive tool, not an official Legal Metrology finding."
}
```

Errors return `{"error": "..."}` with HTTP 400 (bad input) or 502 (model unavailable and no result).

## Streaming variant: POST /api/jaanch

Same inputs in camelCase (`imageBase64`, `mediaType`, `listingText`, `url`, `role`, `language`, `question`, `sampleFile`). Returns `application/x-ndjson`; one JSON event per line: `{"type":"step",...}`, `{"type":"state",...}`, `{"type":"final",...}` or `{"type":"error",...}`.
