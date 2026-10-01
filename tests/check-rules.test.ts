import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRules } from "../src/lib/tools/check-rules";
import { compareLabelListing } from "../src/lib/tools/compare-label-listing";
import { buildFixList } from "../src/lib/tools/make-fix-list";
import { EMPTY_DECLARATIONS, type Declarations } from "../src/lib/types";

const compliant = (): Declarations => ({
  ...EMPTY_DECLARATIONS,
  productName: "Classic Thick Poha",
  commodityName: "Flattened Rice (Poha)",
  manufacturer: { name: "Sunrise Valley Foods Pvt. Ltd.", address: "Plot 14, MIDC, Nashik 422007, Maharashtra, India" },
  netQuantity: { raw: "Net Quantity: 500 g", value: 500, unit: "g" },
  mrp: { raw: "MRP ₹ 65.00 (inclusive of all taxes)", amount: 65, inclusiveOfAllTaxes: true },
  dateOfManufacture: "08/2026",
  consumerCare: { name: "Sunrise Valley", address: "Nashik 422007", phone: "1800 123 4567", email: "care@sunrisevalley.example" },
  countryOfOrigin: "India",
  isImported: false,
  category: "food",
  languages: ["English"],
  textSize: { flag: "normal", confidence: 0.9 },
  rawText: "Country of Origin: India",
  confidence: 0.95,
});

const status = (d: Declarations, id: string) => checkRules(d).results.find((r) => r.ruleId === id)?.status;

test("fully compliant label passes every applicable rule", () => {
  const res = checkRules(compliant());
  assert.equal(res.verdict, "COMPLIANT");
  assert.equal(res.counts.FAIL + res.counts.MISSING + res.counts.NEEDS_REVIEW, 0);
  assert.ok(res.notApplicable.some((n) => n.ruleId === "LMPC-6-1-aa-ORIGIN"), "origin rule not applicable to domestic pack");
  assert.ok(res.results.every((r) => r.verified === false), "every result carries verified:false");
});

test("missing MRP → MISSING on both MRP rules", () => {
  const d = compliant();
  d.mrp = { raw: null, amount: null, inclusiveOfAllTaxes: null };
  assert.equal(status(d, "LMPC-6-1-e-MRP"), "MISSING");
  assert.equal(status(d, "LMPC-6-1-e-MRP-TAXES"), "MISSING");
  assert.equal(checkRules(d).verdict, "VIOLATIONS");
});

test("MRP without 'inclusive of all taxes' → FAIL; Hindi wording passes", () => {
  const d = compliant();
  d.mrp = { raw: "MRP ₹ 48.00", amount: 48, inclusiveOfAllTaxes: false };
  d.rawText = "MRP ₹ 48.00";
  assert.equal(status(d, "LMPC-6-1-e-MRP-TAXES"), "FAIL");
  d.mrp = { raw: "अधिकतम खुदरा मूल्य ₹ 120.00 (सभी करों सहित)", amount: 120, inclusiveOfAllTaxes: null };
  assert.equal(status(d, "LMPC-6-1-e-MRP-TAXES"), "PASS");
});

test("imperial units FAIL, informal spellings NEEDS_REVIEW, sub-kilogram in kg NEEDS_REVIEW", () => {
  const d = compliant();
  d.netQuantity = { raw: "Net Wt: 7 oz", value: 7, unit: "oz" };
  assert.equal(status(d, "LMPC-13-STANDARD-UNITS"), "FAIL");
  d.netQuantity = { raw: "Net Qty: 500 gms", value: 500, unit: "gms" };
  assert.equal(status(d, "LMPC-13-STANDARD-UNITS"), "NEEDS_REVIEW");
  d.netQuantity = { raw: "Net Qty: 0.5 kg", value: 0.5, unit: "kg" };
  assert.equal(status(d, "LMPC-13-STANDARD-UNITS"), "NEEDS_REVIEW");
});

test("imported pack without country of origin → MISSING; inferred origin → NEEDS_REVIEW", () => {
  const d = compliant();
  d.manufacturer = { name: null, address: null };
  d.importer = { name: "Bluefin Trading LLP", address: "22 Marine Lines, Mumbai 400020" };
  d.countryOfOrigin = null;
  d.rawText = "Imported by Bluefin Trading LLP";
  assert.equal(status(d, "LMPC-6-1-aa-ORIGIN"), "MISSING");
  d.countryOfOrigin = "India";
  assert.equal(status(d, "LMPC-6-1-aa-ORIGIN"), "NEEDS_REVIEW");
});

test("text size can never FAIL", () => {
  const d = compliant();
  d.textSize = { flag: "small", confidence: 0.9 };
  assert.equal(status(d, "LMPC-7-2-TEXT-SIZE"), "NEEDS_REVIEW");
  assert.equal(checkRules(d).verdict, "NEEDS_REVIEW");
});

test("Rule 26(a) exemption downgrades failures to NEEDS_REVIEW for ≤10 g packs (not tobacco)", () => {
  const d = compliant();
  d.netQuantity = { raw: "Net Qty: 8 g", value: 8, unit: "g" };
  d.mrp = { raw: null, amount: null, inclusiveOfAllTaxes: null };
  const res = checkRules(d);
  assert.equal(res.results.find((r) => r.ruleId === "LMPC-6-1-e-MRP")?.status, "NEEDS_REVIEW");
  assert.equal(res.exemptionsApplied.length, 1);
  d.category = "tobacco";
  assert.equal(status(d, "LMPC-6-1-e-MRP"), "MISSING");
});

test("consumer care: phone only → NEEDS_REVIEW, none → MISSING", () => {
  const d = compliant();
  d.consumerCare = { name: null, address: null, phone: "1800 111 2222", email: null };
  assert.equal(status(d, "LMPC-6-2-CONSUMER-CARE"), "NEEDS_REVIEW");
  d.consumerCare = { name: null, address: null, phone: null, email: null };
  assert.equal(status(d, "LMPC-6-2-CONSUMER-CARE"), "MISSING");
});

test("listing-only declarations skip the text-size rule", () => {
  const d = compliant();
  d.sourceKind = "listing";
  d.textSize = { flag: "unknown", confidence: 0 };
  const res = checkRules(d);
  assert.ok(res.notApplicable.some((n) => n.ruleId === "LMPC-7-2-TEXT-SIZE"));
});

test("compareLabelListing flags price above MRP and quantity mismatch, normalising units", () => {
  const label = compliant();
  const listing = compliant();
  listing.mrp = { raw: "M.R.P.: ₹ 89", amount: 89, inclusiveOfAllTaxes: null };
  listing.netQuantity = { raw: "Item Weight: 0.45 Kilograms", value: 0.45, unit: "kg" };
  const out = compareLabelListing(label, listing);
  assert.deepEqual(out.mismatches.map((m) => m.field).sort(), ["mrp", "netQuantity"]);
  assert.equal(out.mismatches.find((m) => m.field === "mrp")?.severity, "high");
  listing.netQuantity = { raw: "0.5 kg", value: 0.5, unit: "kg" };
  listing.mrp = label.mrp;
  assert.equal(compareLabelListing(label, listing).mismatches.length, 0, "0.5 kg equals 500 g");
});

test("fix-list converts 7 oz to grams and fills the MRP wording", () => {
  const d = compliant();
  d.netQuantity = { raw: "Net Wt: 7 oz", value: 7, unit: "oz" };
  d.mrp = { raw: "MRP ₹ 199.00", amount: 199, inclusiveOfAllTaxes: false };
  d.rawText = "";
  const items = buildFixList(d, checkRules(d));
  assert.equal(items.find((i) => i.ruleId === "LMPC-13-STANDARD-UNITS")?.correctedText, "Net Quantity: 198 g");
  assert.equal(items.find((i) => i.ruleId === "LMPC-6-1-e-MRP-TAXES")?.correctedText, "MRP ₹ 199.00 (inclusive of all taxes)");
});
