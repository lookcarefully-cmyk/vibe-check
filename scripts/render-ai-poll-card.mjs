import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a1238"/>

  <text x="600" y="122" fill="#5fd3d4" font-family="Arial, Helvetica, sans-serif"
    font-size="24" letter-spacing="8" text-anchor="middle">VIBE CHECK · MONTHLY AI POLL</text>

  <text x="600" y="220" fill="#f2ebda" font-family="Arial, Helvetica, sans-serif"
    font-size="76" font-weight="700" text-anchor="middle">How are we feeling about</text>
  <text x="600" y="302" fill="#f2ebda" font-family="Arial, Helvetica, sans-serif"
    font-size="76" font-weight="700" text-anchor="middle">AI?</text>

  <g font-family="Arial, Helvetica, sans-serif" font-size="23" fill="#f2ebda">
    <rect x="176" y="363" width="257" height="60" rx="30" fill="none" stroke="#2a6678" stroke-width="2"/>
    <circle cx="212" cy="393" r="15" fill="#16445c"/>
    <text x="212" y="401" fill="#5fd3d4" font-size="17" font-weight="700" text-anchor="middle">1</text>
    <text x="240" y="402">Alignment today</text>

    <rect x="463" y="363" width="222" height="60" rx="30" fill="none" stroke="#2a6678" stroke-width="2"/>
    <circle cx="499" cy="393" r="15" fill="#16445c"/>
    <text x="499" y="401" fill="#5fd3d4" font-size="17" font-weight="700" text-anchor="middle">2</text>
    <text x="527" y="402">Who benefits</text>

    <rect x="715" y="363" width="309" height="60" rx="30" fill="none" stroke="#2a6678" stroke-width="2"/>
    <circle cx="751" cy="393" r="15" fill="#16445c"/>
    <text x="751" y="401" fill="#5fd3d4" font-size="17" font-weight="700" text-anchor="middle">3</text>
    <text x="779" y="402">Move faster or slower</text>
  </g>

  <rect x="380" y="470" width="440" height="64" rx="32" fill="#f2b138"/>
  <text x="600" y="512" fill="#0a1238" font-family="Arial, Helvetica, sans-serif"
    font-size="27" text-anchor="middle">Three questions · once a month</text>
</svg>`;

const output = fileURLToPath(new URL("../public/ai-poll-card.png", import.meta.url));
await mkdir(fileURLToPath(new URL("../public", import.meta.url)), { recursive: true });

await sharp(Buffer.from(svg))
  .png()
  .toFile(output);

console.log("Rendered public/ai-poll-card.png");
