import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const names = ["dashboard", "documents", "event-review", "events", "settings"];
const sourceDirectory = process.argv[2];
const outputDirectory = process.argv[3]
  ?? path.resolve(process.cwd(), "public", "backgrounds");
const maximumBytes = 650 * 1024;

if (!sourceDirectory) {
  throw new Error(
    "Usage: node scripts/prepare-workspace-backgrounds.mjs <source-directory> [output-directory]",
  );
}

await mkdir(outputDirectory, { recursive: true });

for (const name of names) {
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
