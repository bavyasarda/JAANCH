import sharp from "sharp";
import { writeFileSync } from "node:fs";
const svg = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#e07b1a"/>
  <rect x="96" y="128" width="320" height="256" rx="28" fill="#fffdf8"/>
  <rect x="128" y="168" width="200" height="22" rx="11" fill="#e07b1a"/>
  <rect x="128" y="212" width="256" height="18" rx="9" fill="#9a9a9a"/>
  <rect x="128" y="246" width="224" height="18" rx="9" fill="#9a9a9a"/>
  <rect x="128" y="280" width="176" height="18" rx="9" fill="#9a9a9a"/>
  <circle cx="352" cy="312" r="64" fill="#1a7f37"/>
  <path d="M318 312 l24 24 l48 -52" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
(async () => {
  for (const s of [192, 512]) {
    writeFileSync(`public/icon-${s}.png`, await sharp(Buffer.from(svg(s))).resize(s, s).png().toBuffer());
  }
  writeFileSync("public/icon.svg", svg(512));
  console.log("icons ok");
})();
