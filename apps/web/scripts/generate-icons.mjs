import { mkdir, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const iconsDir = join(publicDir, "icons");
const pngSource = join(publicDir, "app-icon-source.png");
const svgSource = join(publicDir, "icon.svg");

mkdir(iconsDir, { recursive: true }, () => {});

const source = existsSync(pngSource) ? pngSource : svgSource;
const pipeline = source.endsWith(".png")
  ? sharp(pngSource)
  : sharp(readFileSync(svgSource));

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await pipeline
    .clone()
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(join(iconsDir, name));
  console.log(`Generated public/icons/${name}`);
}
