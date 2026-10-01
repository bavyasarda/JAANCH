/** Shared Mermaid definition of the Jaanch agent workflow (also embedded in the README). */
export const AGENT_WORKFLOW_MERMAID = `flowchart TD
  U([User: photo / link / pasted text<br/>+ role + language + voice question]) --> A[Planner LLM<br/>openai/gpt-oss-120b on Groq]
  A -->|tool call| E[extractLabel<br/>vision: qwen/qwen3.8-27b]
  A -->|tool call| S[scrapeListing<br/>fetch + cheerio]
  S -->|blocked?| P[parseListingText<br/>paste fallback]
  E --> R{{checkRules<br/>deterministic TypeScript<br/>over rules.json}}
  P --> R
  E --> C[compareLabelListing<br/>deterministic]
  P --> C
  R --> X[explainVerdict<br/>user's language + English]
  C --> X
  X --> G[draftGrievance<br/>Consumer]
  X --> F[makeFixList<br/>Seller]
  X --> T[prepareReport<br/>Inspector]
  G & F & T --> O([Results + Agent steps timeline<br/>Listen / Copy / Save as PDF])
  classDef det fill:#1a7f37,color:#fff,stroke:#0f5a26;
  classDef llm fill:#e07b1a,color:#fff,stroke:#a85a0e;
  class R,C det;
  class A,E,X,G,F,P llm;`;
