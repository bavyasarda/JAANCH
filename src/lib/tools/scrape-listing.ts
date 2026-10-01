import * as cheerio from "cheerio";

export interface ScrapeResult {
  ok: boolean;
  url: string;
  title?: string;
  text?: string;
  error?: string;
  blocked?: boolean;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KEY_RE = /(net\s*(quantity|qty|weight|wt|content)|country\s*of\s*origin|manufacturer|manufactured|packer|packed\s*by|importer|imported\s*by|marketed\s*by|m\.?\s*r\.?\s*p|maximum\s*retail|price|brand|item\s*weight|generic\s*name|customer\s*care|consumer\s*care|best\s*before|expiry|shelf\s*life|date\s*of\s*(mfg|manufacture|packing))/i;

/** Fetch a product page and pull out the lines that look like label declarations. */
export async function scrapeListing(url: string): Promise<ScrapeResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return { ok: false, url, error: "That does not look like a valid http(s) link." };
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  let html: string;
  let status = 0;
  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8" },
      redirect: "follow",
      signal: ac.signal,
    });
    status = res.status;
    html = await res.text();
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, url, error: e instanceof Error && e.name === "AbortError" ? "The product page took too long to respond." : "Could not reach the product page." };
  }
  clearTimeout(timer);

  const blocked = status === 403 || status === 429 || status === 503 || /captcha|robot check|automated access|access denied|are you a human/i.test(html.slice(0, 20000));
  if (blocked) return { ok: false, url, blocked: true, error: `The site blocked automated access (HTTP ${status}). Paste the listing details as text instead.` };
  if (status >= 400) return { ok: false, url, error: `The product page returned HTTP ${status}.` };

  const $ = cheerio.load(html);
  $("script:not([type='application/ld+json']), style, noscript, svg, iframe, nav, footer, header").remove();
  const title = ($("meta[property='og:title']").attr("content") || $("#productTitle").text() || $("h1").first().text() || $("title").text()).trim().replace(/\s+/g, " ");

  const lines = new Set<string>();
  const push = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t.length >= 3 && t.length <= 300) lines.add(t);
  };
  if (title) push(`Title: ${title}`);

  // JSON-LD Product data (works on many Indian e-commerce and D2C sites).
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const t = String(it["@type"] ?? "");
        if (/Product/i.test(t)) {
          if (it.name) push(`Product: ${it.name}`);
          if (it.brand) push(`Brand: ${typeof it.brand === "object" ? it.brand.name : it.brand}`);
          const offers = Array.isArray(it.offers) ? it.offers[0] : it.offers;
          if (offers?.price) push(`Price: ${offers.priceCurrency ?? ""} ${offers.price}`);
          if (it.weight) push(`Weight: ${typeof it.weight === "object" ? `${it.weight.value} ${it.weight.unitCode ?? ""}` : it.weight}`);
          if (it.countryOfOrigin) push(`Country of origin: ${typeof it.countryOfOrigin === "object" ? it.countryOfOrigin.name : it.countryOfOrigin}`);
          if (it.manufacturer) push(`Manufacturer: ${typeof it.manufacturer === "object" ? it.manufacturer.name : it.manufacturer}`);
          if (it.description) push(`Description: ${String(it.description).slice(0, 300)}`);
        }
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  });

  // Amazon / Flipkart / generic spec tables and key-value rows.
  $("#productTitle, #priceblock_ourprice, .a-price .a-offscreen, #corePrice_feature_div .a-offscreen, ._30jeq3, .Nx9bqj, ._16Jk6d").each((_, el) => push($(el).text()));
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("th, td").map((__, c) => $(c).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length >= 2 && KEY_RE.test(cells[0])) push(`${cells[0]}: ${cells.slice(1).join(" ")}`);
  });
  $("li, p, div, span").each((_, el) => {
    const t = $(el).clone().children().remove().end().text().replace(/\s+/g, " ").trim();
    if (t.length >= 8 && t.length <= 200 && KEY_RE.test(t)) push(t);
    if (lines.size > 120) return false;
  });

  const text = [...lines].join("\n");
  if (text.length < 40) return { ok: false, url, error: "Could not find any label-like details on that page. Paste the listing text instead." };
  return { ok: true, url, title, text: text.slice(0, 6000) };
}
