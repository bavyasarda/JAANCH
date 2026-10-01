export const DISCLAIMER =
  "Jaanch is an assistive tool, not an official Legal Metrology finding.";

export const ROLES = [
  { value: "consumer", label: "Consumer", hint: "Draft a grievance for the National Consumer Helpline" },
  { value: "seller", label: "Seller (MSME)", hint: "Get a fix-list of corrected label content" },
  { value: "inspector", label: "Inspector", hint: "Get a printable compliance report" },
] as const;
export type Role = (typeof ROLES)[number]["value"];

export const LANGUAGES = [
  { value: "hi-IN", label: "हिन्दी", english: "Hindi" },
  { value: "en-IN", label: "English", english: "English" },
  { value: "ta-IN", label: "தமிழ்", english: "Tamil" },
  { value: "bn-IN", label: "বাংলা", english: "Bengali" },
  { value: "mr-IN", label: "मराठी", english: "Marathi" },
  { value: "te-IN", label: "తెలుగు", english: "Telugu" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["value"];

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.english ?? "English";
}

export const SAMPLE_LABELS = [
  { file: "01-compliant-en.png", title: "Fully compliant (English)" },
  { file: "02-missing-mrp.png", title: "Missing MRP" },
  { file: "03-mrp-no-taxes.png", title: "MRP without 'inclusive of all taxes'" },
  { file: "04-missing-care.png", title: "Missing consumer care details" },
  { file: "05-nonstandard-units.png", title: "Net quantity in non-standard units" },
  { file: "06-missing-address.png", title: "Missing manufacturer address" },
  { file: "07-missing-date.png", title: "Missing date of manufacture/packing" },
  { file: "08-import-no-origin.png", title: "Imported, no country of origin" },
  { file: "09-tiny-text.png", title: "Very small declaration text" },
  { file: "10-compliant-hi.png", title: "Fully compliant Hindi (Devanagari)" },
] as const;
