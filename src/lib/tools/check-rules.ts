import rulesFile from "@/data/rules.json";
import type { CheckRulesOutput, Declarations, Rule, RuleResult, RuleStatus } from "@/lib/types";

/**
 * Deterministic rule engine. No LLM involvement: every PASS / FAIL / MISSING /
 * NEEDS_REVIEW decision here is made in plain TypeScript over rules.json.
 */
const RULES = (rulesFile as { rules: Rule[] }).rules;
const SOURCE_DOCUMENT = (rulesFile as { sourceDocument: string }).sourceDocument;

// Standard unit symbols per Rule 13 (mass, volume, length, area, count).
const STANDARD_UNITS = new Set(["g", "kg", "mg", "ml", "l", "m", "cm", "mm", "cm2", "dm2", "m2", "cm3", "dm3", "m3", "n", "u"]);
const INFORMAL_UNITS: Record<string, string> = {
  gm: "g", gms: "g", gram: "g", grams: "g", kgs: "kg", kilogram: "kg", kilograms: "kg",
  ltr: "l", lt: "l", ltrs: "l", litre: "l", liter: "l", litres: "l", liters: "l", mls: "ml", millilitre: "ml", milliliter: "ml",
  pc: "N", pcs: "N", piece: "N", pieces: "N", no: "N", nos: "N", unit: "N", units: "N", pack: "N", packs: "N", tablets: "N", capsules: "N",
  mtr: "m", mtrs: "m", metre: "m", meter: "m", cms: "cm",
};
const IMPERIAL_UNITS = new Set(["oz", "lb", "lbs", "pound", "pounds", "ounce", "ounces", "floz", "fl.oz", "gallon", "gal", "pint", "quart", "inch", "inches", "in", "ft", "feet", "foot", "yard", "yd"]);

const MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*[-/.,' ]?\s*(20)?\d{2}\b/i;
const NUMERIC_MONTH_YEAR = /\b(0?[1-9]|1[0-2])\s*[-/.]\s*(20\d{2}|\d{2})\b/;
const DEVANAGARI_MONTHS = /(जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)/;
const ORIGIN_STATEMENT = /(country\s+of\s+origin|made\s+in|product\s+of|produce\s+of|manufactured\s+in|origin\s*[:：]|मूल\s*देश|उत्पत्ति\s*देश|निर्मित)/i;
const INCLUSIVE_TAXES = /(incl(usive|\.)?\s*(of)?\s*all\s*taxes|inclusive\s+of\s+all\s+taxes|सभी\s*करों\s*सहित|सर्व\s*करांसह|அனைத்து\s*வரிகளும்\s*உட்பட|সমস্ত\s*কর\s*সহ|అన్ని\s*పన్నులతో\s*సహా)/i;

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function responsibleParty(d: Declarations): { role: string; name: string | null; address: string | null } {
  const order: Array<[string, { name: string | null; address: string | null }]> = [
    ["manufacturer", d.manufacturer],
    ["packer", d.packer],
    ["importer", d.importer],
    ["marketer", d.marketer],
  ];
  for (const [role, p] of order) if (p?.name) return { role, name: p.name, address: p.address ?? null };
  for (const [role, p] of order) if (p?.address) return { role, name: null, address: p.address };
  return { role: "unknown", name: null, address: null };
}

export function isImported(d: Declarations): boolean {
  if (d.isImported === true) return true;
  if (d.importer?.name || d.importer?.address) return true;
  const origin = d.countryOfOrigin?.toLowerCase().trim();
  if (origin && origin !== "india" && origin !== "भारत") return true;
  if (/imported\s+by|आयातक/i.test(d.rawText ?? "")) return true;
  return false;
}

function parseQuantity(d: Declarations): { value: number | null; unit: string | null } {
  let value = d.netQuantity?.value ?? null;
  let unit = d.netQuantity?.unit ?? null;
  const raw = d.netQuantity?.raw ?? "";
  if ((value == null || unit == null) && raw) {
    const m = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([a-zA-Z.]+)/);
    if (m) {
      value = value ?? parseFloat(m[1]);
      unit = unit ?? m[2];
    }
  }
  return { value, unit };
}

function normaliseUnit(unit: string): string {
  return unit.replace(/[\s.]/g, "").toLowerCase().replace(/^ℓ$/, "l");
}

type Ctx = { d: Declarations; party: ReturnType<typeof responsibleParty>; qty: { value: number | null; unit: string | null } };

const CUSTOM_CHECKS: Record<string, (ctx: Ctx) => { status: RuleStatus; reason: string; evidence: string | null }> = {
  addressComplete: ({ party }) => {
    const addr = party.address?.trim();
    if (!addr) return { status: "MISSING", reason: `No address found for the ${party.role === "unknown" ? "manufacturer / packer / importer" : party.role}.`, evidence: null };
    const hasPin = /\b\d{6}\b/.test(addr);
    const parts = addr.split(/[,\n]/).filter((p) => p.trim().length > 1).length;
    if (hasPin || parts >= 3) return { status: "PASS", reason: `Address of the ${party.role} appears complete${hasPin ? " (PIN code present)" : ""}.`, evidence: addr };
    return { status: "NEEDS_REVIEW", reason: "An address is printed but looks incomplete (no PIN code, few address parts). Verify it is a complete postal address.", evidence: addr };
  },

  standardUnit: ({ d, qty }) => {
    if (!d.netQuantity?.raw && qty.value == null) return { status: "MISSING", reason: "Net quantity not declared, so units cannot be checked.", evidence: null };
    if (!qty.unit) return { status: "NEEDS_REVIEW", reason: "Net quantity found but the unit could not be read. Verify it uses g / kg / ml / l / m / N.", evidence: d.netQuantity.raw };
    const u = normaliseUnit(qty.unit);
    const evidence = d.netQuantity.raw ?? `${qty.value ?? ""} ${qty.unit}`;
    if (IMPERIAL_UNITS.has(u)) return { status: "FAIL", reason: `'${qty.unit}' is not a standard unit under Rule 13. Use g / kg for weight, ml / l for volume, m / cm for length.`, evidence };
    if (STANDARD_UNITS.has(u)) {
      if (qty.value != null) {
        if (u === "kg" && qty.value < 1) return { status: "NEEDS_REVIEW", reason: "Quantities below 1 kg should be expressed in grams (Rule 13(2)(a)).", evidence };
        if (u === "l" && qty.value < 1) return { status: "NEEDS_REVIEW", reason: "Quantities below 1 litre should be expressed in millilitres (Rule 13(2)(f)).", evidence };
        if (u === "g" && qty.value > 1000) return { status: "NEEDS_REVIEW", reason: "Quantities above 1 kg should be expressed in kilograms (Rule 13(3)(a)).", evidence };
        if (u === "ml" && qty.value > 1000) return { status: "NEEDS_REVIEW", reason: "Quantities above 1 litre should be expressed in litres (Rule 13(3)(e)).", evidence };
      }
      return { status: "PASS", reason: `Net quantity uses the standard unit '${qty.unit}'.`, evidence };
    }
    if (INFORMAL_UNITS[u]) return { status: "NEEDS_REVIEW", reason: `Unit written as '${qty.unit}'; the standard symbol is '${INFORMAL_UNITS[u]}'. Verify against Rule 13.`, evidence };
    return { status: "NEEDS_REVIEW", reason: `Unrecognised unit '${qty.unit}'. Verify it is a standard unit under Rule 13.`, evidence };
  },

  monthYear: ({ d }) => {
    const raw = d.dateOfManufacture?.trim();
    if (!raw) return { status: "MISSING", reason: "No month and year of manufacture / packing / import found on the label.", evidence: null };
    if (MONTHS.test(raw) || NUMERIC_MONTH_YEAR.test(raw) || DEVANAGARI_MONTHS.test(raw) || /\b20\d{2}\b/.test(raw)) {
      return { status: "PASS", reason: "Month and year of manufacture / packing is declared.", evidence: raw };
    }
    return { status: "NEEDS_REVIEW", reason: "A date was found but the month/year format is unclear. Verify it states the month and year.", evidence: raw };
  },

  mrpInclusive: ({ d }) => {
    const raw = d.mrp?.raw?.trim();
    if (!raw && d.mrp?.amount == null) return { status: "MISSING", reason: "No MRP found, so the 'inclusive of all taxes' wording cannot be checked.", evidence: null };
    const text = `${raw ?? ""} ${d.rawText ?? ""}`;
    if (d.mrp.inclusiveOfAllTaxes === true || INCLUSIVE_TAXES.test(text)) {
      return { status: "PASS", reason: "MRP is stated as inclusive of all taxes.", evidence: raw ?? null };
    }
    return { status: "FAIL", reason: "MRP is printed without stating that it is inclusive of all taxes (e.g. 'MRP ₹ xx.xx (inclusive of all taxes)').", evidence: raw ?? null };
  },

  consumerCare: ({ d }) => {
    const c = d.consumerCare ?? { name: null, address: null, phone: null, email: null };
    const phone = c.phone?.trim();
    const email = c.email?.trim();
    const evidence = [c.name, c.phone, c.email].filter(Boolean).join(" · ") || null;
    if (phone && email) return { status: "PASS", reason: "Consumer care telephone number and e-mail are present.", evidence };
    if (phone || email) return { status: "NEEDS_REVIEW", reason: `Only a consumer care ${phone ? "telephone number" : "e-mail"} was found. Rule 6(2) asks for name, address, telephone number and e-mail.`, evidence };
    return { status: "MISSING", reason: "No consumer care telephone number or e-mail found on the label.", evidence: null };
  },

  language: ({ d }) => {
    const langs = (d.languages ?? []).map((l) => l.toLowerCase());
    if (langs.length === 0) return { status: "NEEDS_REVIEW", reason: "Could not determine the language of the declarations.", evidence: null };
    const ok = langs.some((l) => /^(en|eng|english|hi|hin|hindi|devanagari)/.test(l));
    if (ok) return { status: "PASS", reason: `Declarations are in ${d.languages.join(", ")}, which satisfies Rule 9(4).`, evidence: d.languages.join(", ") };
    return { status: "FAIL", reason: `Declarations appear only in ${d.languages.join(", ")}. They must be in Hindi (Devanagari) or English; other languages may be added.`, evidence: d.languages.join(", ") };
  },

  textSize: ({ d }) => {
    const t = d.textSize ?? { flag: "unknown", confidence: 0 };
    if (t.flag === "small") return { status: "NEEDS_REVIEW", reason: `Declaration text looks small in the photo (confidence ${Math.round(t.confidence * 100)}%). Physically measure letter height against Rule 7(2) Table I.`, evidence: null };
    if (t.flag === "normal") return { status: "PASS", reason: "Declaration text looks adequately sized in the photo. Physical measurement is still required for an official finding.", evidence: null };
    return { status: "NEEDS_REVIEW", reason: "Text size could not be estimated from the image. Measure letter height against Rule 7(2) Table I.", evidence: null };
  },
};

function exemptionApplies(rule: Rule, ctx: Ctx): string | null {
  for (const ex of rule.exemptions ?? []) {
    if (ex.type === "netQuantityAtMost") {
      const u = ctx.qty.unit ? normaliseUnit(ctx.qty.unit) : null;
      if (ctx.qty.value != null && u && ex.units.includes(u) && ctx.qty.value <= ex.value) {
        if (ex.unless?.includes(ctx.d.category ?? "")) continue;
        return `${ex.source}: package of ${ctx.qty.value} ${u} is ${ex.value} ${u} or less`;
      }
    }
  }
  return null;
}

export function checkRules(declarations: Declarations): CheckRulesOutput {
  const d = declarations;
  const ctx: Ctx = { d, party: responsibleParty(d), qty: parseQuantity(d) };
  const imported = isImported(d);
  const results: RuleResult[] = [];
  const notApplicable: CheckRulesOutput["notApplicable"] = [];
  const exemptionsApplied = new Set<string>();

  for (const rule of RULES) {
    if (rule.appliesTo === "imported" && !imported) {
      notApplicable.push({ ruleId: rule.id, title: rule.title, reason: "Applies to imported products only; this label does not appear to be imported." });
      continue;
    }
    if (rule.customCheck === "textSize" && d.sourceKind === "listing") {
      notApplicable.push({ ruleId: rule.id, title: rule.title, reason: "Text size can only be assessed from a photo of the pack, not from an online listing." });
      continue;
    }
    if (rule.appliesTo === "domestic" && imported) {
      notApplicable.push({ ruleId: rule.id, title: rule.title, reason: "Applies to domestic products only." });
      continue;
    }

    let status: RuleStatus;
    let reason: string;
    let evidence: string | null = null;

    // Resolve the field value (responsibleParty.* is a derived field).
    const value = rule.field.startsWith("responsibleParty.") ? get(ctx.party, rule.field.slice("responsibleParty.".length)) : get(d, rule.field);

    if (rule.check === "present" && rule.field === "countryOfOrigin" && nonEmpty(value) && d.rawText && !ORIGIN_STATEMENT.test(d.rawText)) {
      // The model reported an origin but the label text has no explicit origin statement: likely inferred from an address.
      status = "NEEDS_REVIEW";
      reason = `A country ('${String(value)}') was reported but no explicit 'Country of Origin' / 'Made in' statement was read on the label. Verify the declaration is actually printed.`;
      evidence = String(value);
    } else if (rule.check === "present") {
      if (nonEmpty(value)) {
        status = "PASS";
        reason = `${rule.title} is declared.`;
        evidence = typeof value === "string" ? value : JSON.stringify(value);
      } else {
        status = "MISSING";
        reason = `${rule.title} was not found on the label.`;
      }
    } else if (rule.check === "pattern") {
      if (!nonEmpty(value)) {
        status = "MISSING";
        reason = `${rule.title} was not found on the label.`;
      } else {
        const re = new RegExp(rule.pattern ?? ".*", "i");
        const ok = re.test(String(value));
        status = ok ? "PASS" : "FAIL";
        reason = ok ? `${rule.title} matches the required format.` : `${rule.title} does not match the required format.`;
        evidence = String(value);
      }
    } else {
      const fn = rule.customCheck ? CUSTOM_CHECKS[rule.customCheck] : undefined;
      if (!fn) {
        status = "NEEDS_REVIEW";
        reason = `No checker implemented for '${rule.customCheck}'.`;
      } else {
        ({ status, reason, evidence } = fn(ctx));
      }
    }

    // Text-size can never FAIL (image cannot establish physical dimensions).
    if (rule.customCheck === "textSize" && (status === "FAIL" || status === "MISSING")) status = "NEEDS_REVIEW";

    if (status === "FAIL" || status === "MISSING") {
      const ex = exemptionApplies(rule, ctx);
      if (ex) {
        status = "NEEDS_REVIEW";
        reason = `${reason} However, this package may be exempt (${ex}). Verify the exemption applies.`;
        exemptionsApplied.add(ex);
      }
    }

    results.push({ ruleId: rule.id, title: rule.title, status, severity: rule.severity, reason, field: rule.field, evidence, source: rule.source, verified: false });
  }

  const counts: Record<RuleStatus, number> = { PASS: 0, FAIL: 0, MISSING: 0, NEEDS_REVIEW: 0 };
  for (const r of results) counts[r.status]++;
  const verdict = counts.FAIL + counts.MISSING > 0 ? "VIOLATIONS" : counts.NEEDS_REVIEW > 0 ? "NEEDS_REVIEW" : "COMPLIANT";

  return { verdict, results, notApplicable, exemptionsApplied: [...exemptionsApplied], counts, sourceDocument: SOURCE_DOCUMENT };
}

export function getRules(): Rule[] {
  return RULES;
}
