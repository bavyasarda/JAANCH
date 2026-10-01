import type { CompareOutput, Declarations, Mismatch } from "@/lib/types";

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9ऀ-෿]+/g, " ").trim();

function qty(d: Declarations): { value: number | null; unit: string | null } {
  let { value, unit } = d.netQuantity ?? { value: null, unit: null };
  const raw = d.netQuantity?.raw ?? "";
  if ((value == null || !unit) && raw) {
    const m = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([a-zA-Z.]+)/);
    if (m) {
      value = value ?? parseFloat(m[1]);
      unit = unit ?? m[2];
    }
  }
  if (value == null || !unit) return { value: null, unit: null };
  const u = unit.toLowerCase().replace(/[.\s]/g, "");
  // normalise to g / ml / N
  if (["kg", "kgs"].includes(u)) return { value: value * 1000, unit: "g" };
  if (["g", "gm", "gms", "gram", "grams"].includes(u)) return { value, unit: "g" };
  if (["l", "ltr", "lt", "litre", "liter", "ltrs"].includes(u)) return { value: value * 1000, unit: "ml" };
  if (["ml", "mls"].includes(u)) return { value, unit: "ml" };
  if (["oz", "ounce", "ounces"].includes(u)) return { value: value * 28.3495, unit: "g" };
  if (["lb", "lbs", "pound", "pounds"].includes(u)) return { value: value * 453.592, unit: "g" };
  if (["n", "u", "pcs", "pc", "nos", "no", "pieces", "units", "pack"].includes(u)) return { value, unit: "N" };
  return { value, unit: u };
}

function mrpAmount(d: Declarations): number | null {
  if (d.mrp?.amount != null) return d.mrp.amount;
  const m = (d.mrp?.raw ?? "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function partyName(d: Declarations): string | null {
  return d.manufacturer?.name ?? d.packer?.name ?? d.importer?.name ?? d.marketer?.name ?? d.brandName ?? null;
}

/** Deterministic comparison of the physical label against the online listing. */
export function compareLabelListing(label: Declarations, listing: Declarations): CompareOutput {
  const mismatches: Mismatch[] = [];
  const compared: string[] = [];

  const lm = mrpAmount(label), sm = mrpAmount(listing);
  if (lm != null && sm != null) {
    compared.push("mrp");
    if (Math.abs(lm - sm) > 0.5) mismatches.push({ field: "mrp", label: label.mrp?.raw ?? String(lm), listing: listing.mrp?.raw ?? String(sm), severity: sm > lm ? "high" : "medium", reason: sm > lm ? "The listing price is higher than the MRP printed on the pack. Selling above MRP is not permitted." : "The listing price differs from the MRP printed on the pack." });
  }

  const lq = qty(label), sq = qty(listing);
  if (lq.value != null && sq.value != null) {
    compared.push("netQuantity");
    if (lq.unit !== sq.unit || Math.abs(lq.value - sq.value) / Math.max(lq.value, 1) > 0.02) {
      mismatches.push({ field: "netQuantity", label: label.netQuantity?.raw ?? `${lq.value} ${lq.unit}`, listing: listing.netQuantity?.raw ?? `${sq.value} ${sq.unit}`, severity: "high", reason: "Net quantity on the listing does not match the pack." });
    }
  }

  const ln = partyName(label), sn = partyName(listing);
  if (ln && sn) {
    compared.push("manufacturer");
    const a = new Set(norm(ln).split(" ").filter((w) => w.length > 2 && !["pvt", "ltd", "private", "limited", "llp", "co", "company", "foods", "india"].includes(w)));
    const b = new Set(norm(sn).split(" ").filter((w) => w.length > 2));
    const overlap = [...a].filter((w) => b.has(w)).length;
    if (a.size > 0 && overlap === 0) mismatches.push({ field: "manufacturer", label: ln, listing: sn, severity: "medium", reason: "The manufacturer / brand named on the listing does not match the pack." });
  }

  const lo = norm(label.countryOfOrigin), so = norm(listing.countryOfOrigin);
  if (lo && so) {
    compared.push("countryOfOrigin");
    if (lo !== so && !lo.includes(so) && !so.includes(lo)) mismatches.push({ field: "countryOfOrigin", label: label.countryOfOrigin, listing: listing.countryOfOrigin, severity: "high", reason: "Country of origin on the listing differs from the pack." });
  }

  return { mismatches, compared };
}
