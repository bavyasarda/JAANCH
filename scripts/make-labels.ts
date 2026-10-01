/**
 * Generates 10 synthetic back-of-pack label images (SVG -> PNG via sharp) into public/test-labels.
 * All brands, addresses, phone numbers, emails and licence numbers are fictional.
 * Run: npm run labels
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface LabelSpec {
  file: string;
  brand: string;
  product: string;
  generic: string;
  accent: string;
  declarations: string[];
  tiny?: boolean;
  hindi?: boolean;
  veg?: boolean;
  blurb: string;
  nutrition?: [string, string][];
}

const EN_FONT = `'Noto Sans', 'Helvetica Neue', Arial, sans-serif`;
const HI_FONT = `'Devanagari MT', 'Kohinoor Devanagari', 'Noto Sans Devanagari', sans-serif`;

const LABELS: LabelSpec[] = [
  {
    file: "01-compliant-en.png", brand: "SUNRISE VALLEY", product: "Classic Thick Poha", generic: "Flattened Rice (Poha)", accent: "#e07b1a", veg: true,
    blurb: "Sun-dried, thick-cut flattened rice from Nashik farms. Perfect for kanda poha, chivda and quick breakfasts. Store in a cool, dry place away from sunlight. Once opened, transfer to an airtight container.",
    nutrition: [["Energy", "346 kcal"], ["Protein", "6.6 g"], ["Carbohydrate", "77 g"], ["Total Fat", "1.2 g"], ["Sodium", "5 mg"]],
    declarations: [
      "Manufactured & Packed by: Sunrise Valley Foods Pvt. Ltd., Plot 14, MIDC Industrial Area, Satpur, Nashik 422007, Maharashtra, India",
      "Net Quantity: 500 g",
      "MRP ₹ 65.00 (inclusive of all taxes)",
      "Date of Manufacture / Packing: 08/2026",
      "Best Before: 9 months from date of packing",
      "Consumer Care: Sunrise Valley Foods Pvt. Ltd., Plot 14, MIDC Satpur, Nashik 422007 · Toll-free 1800 123 4567 · care@sunrisevalley.example",
      "Country of Origin: India",
      "FSSAI Lic. No. 10012345678901 (fictional)",
    ],
  },
  {
    file: "02-missing-mrp.png", brand: "NILGIRI BREEZE", product: "Premium CTC Leaf Tea", generic: "Black Tea (CTC)", accent: "#2f6b3a", veg: true,
    blurb: "Hand-picked from high-altitude estates and CTC-processed for a strong, brisk cup. Brew 1 teaspoon per cup in freshly boiled water for 3 minutes. Store in an airtight container.",
    nutrition: [["Energy", "0 kcal"], ["Protein", "0 g"], ["Carbohydrate", "0 g"], ["Total Fat", "0 g"]],
    declarations: [
      "Manufactured by: Nilgiri Breeze Tea Co., Estate Road, Coonoor 643101, The Nilgiris, Tamil Nadu, India",
      "Packed by: Nilgiri Breeze Tea Co., Coonoor 643101",
      "Net Quantity: 250 g",
      "Date of Packing: 07/2026",
      "Best Before: 12 months from date of packing",
      "Consumer Care: Nilgiri Breeze Tea Co., Estate Road, Coonoor 643101 · Phone 0423 2200 100 · hello@nilgiribreeze.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "03-mrp-no-taxes.png", brand: "DAKSHIN MASALA CO.", product: "Udupi Sambar Powder", generic: "Spice Mix (Sambar Powder)", accent: "#b3261e", veg: true,
    blurb: "A traditional Udupi blend of coriander, red chilli, fenugreek, toor dal and curry leaves, slow-roasted and ground in small batches. No added colour or preservatives.",
    nutrition: [["Energy", "312 kcal"], ["Protein", "12 g"], ["Carbohydrate", "48 g"], ["Total Fat", "9 g"]],
    declarations: [
      "Manufactured & Packed by: Dakshin Masala Company, No. 7, Industrial Estate, Manipal, Udupi 576104, Karnataka, India",
      "Net Quantity: 100 g",
      "MRP ₹ 48.00",
      "Mfg. Date: 09/2026",
      "Best Before: 6 months from manufacture",
      "Consumer Care: Dakshin Masala Company, Manipal, Udupi 576104 · 1800 200 7788 · care@dakshinmasala.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "04-missing-care.png", brand: "HIMA HONEY", product: "Multiflora Forest Honey", generic: "Honey", accent: "#c98a12", veg: true,
    blurb: "Raw, unheated multiflora honey collected from Himalayan foothill apiaries. Natural crystallisation may occur; place the jar in warm water to restore. Not for infants under 12 months.",
    nutrition: [["Energy", "320 kcal"], ["Carbohydrate", "80 g"], ["Sugars", "79 g"], ["Protein", "0.3 g"]],
    declarations: [
      "Manufactured & Packed by: Hima Honey Farms LLP, Village Rampur, Tehsil Kullu, Kullu 175101, Himachal Pradesh, India",
      "Net Quantity: 500 g",
      "MRP ₹ 349.00 (inclusive of all taxes)",
      "Date of Packing: 06/2026",
      "Best Before: 24 months from packing",
      "Country of Origin: India",
    ],
  },
  {
    file: "05-nonstandard-units.png", brand: "MEGHA BAKES", product: "Danish Butter Cookies", generic: "Butter Cookies", accent: "#1f5fa8", veg: true,
    blurb: "Crisp, buttery cookies baked in Shillong with real butter and vanilla. Contains wheat, milk and egg. May contain traces of nuts. Store in a cool, dry place.",
    nutrition: [["Energy", "480 kcal"], ["Protein", "6 g"], ["Carbohydrate", "62 g"], ["Total Fat", "24 g"]],
    declarations: [
      "Manufactured & Packed by: Megha Bakes Pvt. Ltd., Plot 3, EPIP Industrial Area, Byrnihat 793101, Meghalaya, India",
      "Net Wt: 7 oz",
      "MRP ₹ 199.00 (inclusive of all taxes)",
      "Mfg. Date: 08/2026",
      "Best Before: 9 months from manufacture",
      "Consumer Care: Megha Bakes Pvt. Ltd., Byrnihat 793101 · 1800 345 6789 · care@meghabakes.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "06-missing-address.png", brand: "PURE HARVEST", product: "Roasted Salted Peanuts", generic: "Roasted Peanuts", accent: "#7a4b1d", veg: true,
    blurb: "Premium Junagadh peanuts, dry-roasted and lightly salted. A good source of protein for your evening snack. Contains peanuts. Store in an airtight container.",
    nutrition: [["Energy", "585 kcal"], ["Protein", "25 g"], ["Carbohydrate", "21 g"], ["Total Fat", "49 g"], ["Sodium", "410 mg"]],
    declarations: [
      "Manufactured & Packed by: Pure Harvest Agro Foods",
      "Net Quantity: 200 g",
      "MRP ₹ 85.00 (inclusive of all taxes)",
      "Date of Packing: 09/2026",
      "Best Before: 6 months from packing",
      "Consumer Care: 1800 111 2222 · care@pureharvest.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "07-missing-date.png", brand: "RAJDHANI GRAINS", product: "Aged Basmati Rice", generic: "Basmati Rice", accent: "#6b3fa0", veg: true,
    blurb: "Extra-long grain basmati aged for 18 months for aroma and length. Rinse twice and soak for 30 minutes before cooking. Store in a cool, dry place.",
    nutrition: [["Energy", "350 kcal"], ["Protein", "7.5 g"], ["Carbohydrate", "78 g"], ["Total Fat", "0.6 g"]],
    declarations: [
      "Manufactured & Packed by: Rajdhani Grains Pvt. Ltd., Rice Mill Road, Taraori, Karnal 132116, Haryana, India",
      "Net Quantity: 1 kg",
      "MRP ₹ 160.00 (inclusive of all taxes)",
      "Consumer Care: Rajdhani Grains Pvt. Ltd., Taraori, Karnal 132116 · 1800 500 1234 · care@rajdhanigrains.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "08-import-no-origin.png", brand: "COSTA VERDE", product: "Extra Virgin Olive Oil", generic: "Extra Virgin Olive Oil", accent: "#4d7c0f", veg: true,
    blurb: "Cold-extracted from first-harvest olives. Fruity with a peppery finish. Ideal for salads, dips and finishing. Store away from heat and light.",
    nutrition: [["Energy", "884 kcal"], ["Total Fat", "100 g"], ["Saturated Fat", "14 g"], ["Protein", "0 g"]],
    declarations: [
      "Imported & Marketed by: Bluefin Trading LLP, 22 Marine Lines, Fort, Mumbai 400020, Maharashtra, India",
      "Net Quantity: 500 ml",
      "MRP ₹ 899.00 (inclusive of all taxes)",
      "Date of Import: 07/2026",
      "Best Before: 18 months from date of packing",
      "Consumer Care: Bluefin Trading LLP, 22 Marine Lines, Mumbai 400020 · +91 22 4000 1234 · support@bluefintrading.example",
    ],
  },
  {
    file: "09-tiny-text.png", brand: "DEVI DAILY", product: "Unpolished Toor Dal", generic: "Toor Dal (Split Pigeon Pea)", accent: "#d97706", veg: true, tiny: true,
    blurb: "Unpolished, chemical-free toor dal from Latur. Soak for 20 minutes for faster cooking. Store in a cool, dry place in an airtight container.",
    nutrition: [["Energy", "335 kcal"], ["Protein", "22 g"], ["Carbohydrate", "57 g"], ["Total Fat", "1.5 g"]],
    declarations: [
      "Manufactured & Packed by: Devi Daily Foods Pvt. Ltd., Plot 21, Additional MIDC, Latur 413531, Maharashtra, India",
      "Net Quantity: 1 kg",
      "MRP ₹ 145.00 (inclusive of all taxes)",
      "Date of Packing: 08/2026",
      "Best Before: 9 months from packing",
      "Consumer Care: Devi Daily Foods Pvt. Ltd., Latur 413531 · 1800 777 8899 · care@devidaily.example",
      "Country of Origin: India",
    ],
  },
  {
    file: "10-compliant-hi.png", brand: "अन्नपूर्णा", product: "चना दाल", generic: "चना दाल (स्प्लिट चिकपी)", accent: "#be123c", veg: true, hindi: true,
    blurb: "मध्य प्रदेश के खेतों से चुनी गई उत्तम गुणवत्ता की चना दाल। पकाने से पहले 30 मिनट भिगोएँ। ठंडी और सूखी जगह पर रखें। खोलने के बाद वायुरोधी डिब्बे में रखें।",
    nutrition: [["ऊर्जा", "360 kcal"], ["प्रोटीन", "20 g"], ["कार्बोहाइड्रेट", "60 g"], ["कुल वसा", "5 g"]],
    declarations: [
      "निर्माता एवं पैकर: अन्नपूर्णा फूड्स प्राइवेट लिमिटेड, प्लॉट 7, औद्योगिक क्षेत्र पोलोग्राउंड, इंदौर 452015, मध्य प्रदेश, भारत",
      "शुद्ध मात्रा: 1 kg",
      "अधिकतम खुदरा मूल्य ₹ 120.00 (सभी करों सहित)",
      "निर्माण / पैकिंग का माह व वर्ष: 08/2026",
      "उपयोग की अंतिम तिथि: पैकिंग से 9 माह",
      "उपभोक्ता सेवा: अन्नपूर्णा फूड्स प्रा. लि., इंदौर 452015 · टोल-फ्री 1800 222 3344 · seva@annapurnafoods.example",
      "मूल देश: भारत",
    ],
  },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function barcode(x: number, y: number, w: number, h: number, seed: number): string {
  let out = "";
  let cx = x;
  let s = seed;
  while (cx < x + w) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 2 + (s % 4);
    if (s % 3 !== 0) out += `<rect x="${cx}" y="${y}" width="${bw}" height="${h}" fill="#111"/>`;
    cx += bw + 1;
  }
  return out;
}

function vegMark(x: number, y: number): string {
  return `<rect x="${x}" y="${y}" width="34" height="34" fill="none" stroke="#1a7f37" stroke-width="3"/><circle cx="${x + 17}" cy="${y + 17}" r="9" fill="#1a7f37"/>`;
}

function render(spec: LabelSpec, index: number): string {
  const W = 1200, H = 860;
  const font = spec.hindi ? HI_FONT : EN_FONT;
  const declSize = spec.tiny ? 9 : 19;
  const declLine = spec.tiny ? 12 : 27;
  const maxChars = spec.tiny ? 230 : 92;

  let y = 470;
  let decl = "";
  for (const d of spec.declarations) {
    const lines = wrap(d, maxChars);
    for (const l of lines) {
      decl += `<text x="60" y="${y}" font-size="${declSize}" font-family="${font}" fill="#111" font-weight="${l === lines[0] ? 600 : 400}">${esc(l)}</text>`;
      y += declLine;
    }
    y += spec.tiny ? 3 : 7;
  }

  const blurbLines = wrap(spec.blurb, 58);
  const blurb = blurbLines.map((l, i) => `<text x="60" y="${215 + i * 26}" font-size="18" font-family="${font}" fill="#333">${esc(l)}</text>`).join("");

  const nut = (spec.nutrition ?? [])
    .map(([k, v], i) => `<text x="780" y="${260 + i * 30}" font-size="17" font-family="${font}" fill="#222">${esc(k)}</text><text x="1120" y="${260 + i * 30}" font-size="17" font-family="${font}" fill="#222" text-anchor="end">${esc(v)}</text><line x1="780" y1="${268 + i * 30}" x2="1120" y2="${268 + i * 30}" stroke="#ddd"/>`)
    .join("");

  const nutTitle = spec.hindi ? "पोषण जानकारी (प्रति 100 g)" : "Nutrition Information (per 100 g)";
  const aboutTitle = spec.hindi ? "उत्पाद के बारे में" : "About this product";
  const declTitle = spec.hindi ? "अनिवार्य घोषणाएँ" : "Mandatory Declarations";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${spec.accent}"/><stop offset="1" stop-color="${spec.accent}" stop-opacity="0.75"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#fbf7ee"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="18" fill="#fffdf8" stroke="#d9cfbd" stroke-width="2"/>
  <rect x="24" y="24" width="${W - 48}" height="140" rx="18" fill="url(#g)"/>
  <rect x="24" y="130" width="${W - 48}" height="34" fill="url(#g)"/>
  <text x="60" y="80" font-size="40" font-weight="700" font-family="${font}" fill="#fff" letter-spacing="2">${esc(spec.brand)}</text>
  <text x="60" y="124" font-size="30" font-weight="600" font-family="${font}" fill="#fff">${esc(spec.product)}</text>
  <text x="60" y="154" font-size="18" font-family="${font}" fill="#fff" opacity="0.95">${esc(spec.generic)}</text>
  ${spec.veg ? vegMark(1090, 52) : ""}
  <text x="60" y="195" font-size="20" font-weight="700" font-family="${font}" fill="${spec.accent}">${aboutTitle}</text>
  ${blurb}
  <rect x="760" y="190" width="380" height="${60 + (spec.nutrition?.length ?? 0) * 30}" rx="10" fill="#fff" stroke="#cfc6b5"/>
  <text x="780" y="225" font-size="18" font-weight="700" font-family="${font}" fill="#222">${nutTitle}</text>
  ${nut}
  <line x1="60" y1="430" x2="${W - 60}" y2="430" stroke="${spec.accent}" stroke-width="2"/>
  <text x="60" y="455" font-size="18" font-weight="700" font-family="${font}" fill="${spec.accent}" letter-spacing="1">${declTitle}</text>
  ${decl}
  ${barcode(880, 700, 240, 90, 17 + index * 31)}
  <text x="1000" y="812" font-size="14" font-family="${EN_FONT}" fill="#333" text-anchor="middle">8 90${String(1000000 + index * 4321).padStart(7, "0")} ${String(index * 7).padStart(2, "0")}</text>
  <text x="${W - 60}" y="${H - 40}" font-size="12" font-family="${EN_FONT}" fill="#888" text-anchor="end">Synthetic test label · fictional brand · Jaanch</text>
</svg>`;
}

async function main() {
  const outDir = join(process.cwd(), "public", "test-labels");
  mkdirSync(outDir, { recursive: true });
  for (const [i, spec] of LABELS.entries()) {
    const svg = render(spec, i);
    const png = await sharp(Buffer.from(svg), { density: 96 }).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(join(outDir, spec.file), png);
    console.log(`✓ ${spec.file} (${(png.length / 1024).toFixed(0)} KB)`);
  }
  const manifest = LABELS.map((l, i) => ({ index: i + 1, file: l.file, brand: l.brand, product: l.product }));
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
