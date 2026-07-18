import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const names = ["dashboard", "documents", "event-review", "events", "settings"];
const sourceDirectory = process.argv[2];
const outputDirectory = process.argv[3]
  ?? path.resolve(process.cwd(), "public", "backgrounds");
const maximumBytes = 650 * 1024;

await mkdir(outputDirectory, { recursive: true });

const senseMotif = Buffer.from(`
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="warmth" cx="72%" cy="42%" r="52%">
        <stop offset="0" stop-color="#d88820" stop-opacity="0.22"/>
        <stop offset="0.48" stop-color="#5c3410" stop-opacity="0.09"/>
        <stop offset="1" stop-color="#020304" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect width="1920" height="1080" fill="#020304"/>
    <rect width="1920" height="1080" fill="url(#warmth)"/>
    <g fill="none" stroke="#d9912b" stroke-linecap="round">
      <path d="M1110 210 L1360 330 L1570 220 L1780 415 L1650 655 L1815 810" stroke-opacity="0.16" stroke-width="1.2"/>
      <path d="M990 520 L1250 650 L1500 545 L1650 655 L1500 875 L1815 810" stroke-opacity="0.13" stroke-width="1"/>
      <path d="M1360 330 L1250 650 L1570 220" stroke-opacity="0.1" stroke-width="0.9"/>
      <path d="M1110 210 L990 520 L1250 650" stroke-opacity="0.08" stroke-width="0.8"/>
    </g>
    <g fill="#f2aa3b">
      <circle cx="1110" cy="210" r="4" fill-opacity="0.58"/><circle cx="1360" cy="330" r="5" fill-opacity="0.72"/>
      <circle cx="1570" cy="220" r="3" fill-opacity="0.45"/><circle cx="1780" cy="415" r="4" fill-opacity="0.55"/>
      <circle cx="990" cy="520" r="3" fill-opacity="0.42"/><circle cx="1250" cy="650" r="5" fill-opacity="0.62"/>
      <circle cx="1500" cy="545" r="3" fill-opacity="0.4"/><circle cx="1650" cy="655" r="4" fill-opacity="0.6"/>
      <circle cx="1500" cy="875" r="3" fill-opacity="0.38"/><circle cx="1815" cy="810" r="4" fill-opacity="0.5"/>
    </g>
    <g fill="#f2aa3b" filter="url(#soft)"><circle cx="1360" cy="330" r="14" fill-opacity="0.22"/><circle cx="1250" cy="650" r="15" fill-opacity="0.18"/><circle cx="1650" cy="655" r="12" fill-opacity="0.16"/></g>
  </svg>
`);

for (const name of sourceDirectory ? names : []) {
  const source = path.join(sourceDirectory, `${name}.png`);
  const output = path.join(outputDirectory, `${name}.webp`);

  await sharp(source)
    .resize({ width: 1920, height: 1080, fit: "cover", position: "centre" })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toFile(output);

  const metadata = await sharp(output).metadata();
  const file = await stat(output);

  if (metadata.width !== 1920 || metadata.height !== 1080 || metadata.format !== "webp") {
    throw new Error(`${name}.webp is not a 1920 x 1080 WebP image.`);
  }
  if (file.size > maximumBytes) {
    throw new Error(`${name}.webp is ${file.size} bytes; the limit is ${maximumBytes}.`);
  }

  console.log(`${name}.webp: ${metadata.width}x${metadata.height}, ${file.size} bytes`);
}

const senseOutput = path.join(outputDirectory, "sense.webp");
await sharp(senseMotif)
  .webp({ quality: 80, effort: 6, smartSubsample: true })
  .toFile(senseOutput);

const senseMetadata = await sharp(senseOutput).metadata();
const senseFile = await stat(senseOutput);
if (senseMetadata.width !== 1920 || senseMetadata.height !== 1080 || senseMetadata.format !== "webp") {
  throw new Error("sense.webp is not a 1920 x 1080 WebP image.");
}
if (senseFile.size > maximumBytes) {
  throw new Error(`sense.webp is ${senseFile.size} bytes; the limit is ${maximumBytes}.`);
}
console.log(`sense.webp: ${senseMetadata.width}x${senseMetadata.height}, ${senseFile.size} bytes`);
