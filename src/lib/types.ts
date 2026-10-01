import { z } from "zod";

const nullableString = z.string().nullable().catch(null);
const party = z
  .object({ name: nullableString, address: nullableString })
  .catch({ name: null, address: null });

export const DeclarationsSchema = z.object({
  brandName: nullableString,
  productName: nullableString,
  commodityName: nullableString,
  manufacturer: party,
  packer: party,
  importer: party,
  marketer: party,
  netQuantity: z
    .object({ raw: nullableString, value: z.number().nullable().catch(null), unit: nullableString })
    .catch({ raw: null, value: null, unit: null }),
  mrp: z
    .object({
      raw: nullableString,
      amount: z.number().nullable().catch(null),
      inclusiveOfAllTaxes: z.boolean().nullable().catch(null),
    })
    .catch({ raw: null, amount: null, inclusiveOfAllTaxes: null }),
  dateOfManufacture: nullableString,
  bestBefore: nullableString,
  consumerCare: z
    .object({ name: nullableString, address: nullableString, phone: nullableString, email: nullableString })
    .catch({ name: null, address: null, phone: null, email: null }),
  countryOfOrigin: nullableString,
  isImported: z.boolean().nullable().catch(null),
  category: z.enum(["food", "cosmetic", "drug", "tobacco", "other"]).nullable().catch(null),
  languages: z.array(z.string()).catch([]),
  textSize: z
    .object({ flag: z.enum(["small", "normal", "unknown"]).catch("unknown"), confidence: z.number().min(0).max(1).catch(0.5) })
    .catch({ flag: "unknown", confidence: 0.5 }),
  rawText: nullableString,
  confidence: z.number().min(0).max(1).catch(0.5),
  /** [x1,y1,x2,y2] normalised to 0-1000; used to estimate declaration letter height deterministically. */
  mrpLineBox: z.array(z.number()).length(4).nullable().catch(null),
  bodyTextLineBox: z.array(z.number()).length(4).nullable().catch(null),
  textSizeNote: nullableString,
  /** Where these declarations came from; text-size rules only apply to label photos. */
  sourceKind: z.enum(["label", "listing"]).catch("label"),
});
export type Declarations = z.infer<typeof DeclarationsSchema>;

export const EMPTY_DECLARATIONS: Declarations = {
  brandName: null,
  productName: null,
  commodityName: null,
  manufacturer: { name: null, address: null },
  packer: { name: null, address: null },
  importer: { name: null, address: null },
  marketer: { name: null, address: null },
  netQuantity: { raw: null, value: null, unit: null },
  mrp: { raw: null, amount: null, inclusiveOfAllTaxes: null },
  dateOfManufacture: null,
  bestBefore: null,
  consumerCare: { name: null, address: null, phone: null, email: null },
  countryOfOrigin: null,
  isImported: null,
  category: null,
  languages: [],
  textSize: { flag: "unknown", confidence: 0 },
  rawText: null,
  confidence: 0,
  mrpLineBox: null,
  bodyTextLineBox: null,
  textSizeNote: null,
  sourceKind: "label",
};

export type Severity = "high" | "medium" | "low";
export type RuleStatus = "PASS" | "FAIL" | "MISSING" | "NEEDS_REVIEW";
export type Verdict = "COMPLIANT" | "VIOLATIONS" | "NEEDS_REVIEW";

export interface Exemption {
  type: "netQuantityAtMost";
  value: number;
  units: string[];
  unless?: string[];
  source: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  field: string;
  check: "present" | "pattern" | "custom";
  pattern?: string;
  customCheck?: string;
  appliesTo: "all" | "imported" | "domestic";
  exemptions: Exemption[];
  severity: Severity;
  source: string;
  verified: false;
}

export interface RuleResult {
  ruleId: string;
  title: string;
  status: RuleStatus;
  severity: Severity;
  reason: string;
  field: string;
  evidence: string | null;
  source: string;
  verified: false;
}

export interface CheckRulesOutput {
  verdict: Verdict;
  results: RuleResult[];
  notApplicable: { ruleId: string; title: string; reason: string }[];
  exemptionsApplied: string[];
  counts: Record<RuleStatus, number>;
  sourceDocument: string;
}

export interface Mismatch {
  field: "mrp" | "netQuantity" | "manufacturer" | "countryOfOrigin";
  label: string | null;
  listing: string | null;
  severity: Severity;
  reason: string;
}

export interface CompareOutput {
  mismatches: Mismatch[];
  compared: string[];
}

export interface AgentStep {
  id: string;
  tool: string;
  why: string;
  summary: string;
  status: "running" | "done" | "error";
  startedAt: number;
  durationMs?: number;
  output?: unknown;
}
