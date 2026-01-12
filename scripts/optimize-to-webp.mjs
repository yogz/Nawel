import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Critical landing images - convert to WebP for best compression
const criticalImages = [
  { file: "alt_hero.png", maxWidth: 1200, quality: 80 },
  { file: "alt_ai_chef.png", maxWidth: 1000, quality: 75 },
  { file: "alt_guests.png", maxWidth: 1000, quality: 75 },
  { file: "alt_shopping.png", maxWidth: 1000, quality: 75 },
];

async function convertToWebP({ file, maxWidth, quality }) {
  const inputPath = path.join(PUBLIC_DIR, file);
  const webpPath = inputPath.replace(".png", ".webp");

  if (!fs.existsSync(inputPath)) {
    console.log(`⏭️  Skipping ${file} (not found)`);
    return;
  }

  try {
    const originalSize = fs.statSync(inputPath).size;

    const buffer = await sharp(inputPath)
      .resize(maxWidth, null, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality, effort: 6 })
      .toBuffer();

    fs.writeFileSync(webpPath, buffer);

    const webpSize = buffer.length;
    const savings = (((originalSize - webpSize) / originalSize) * 100).toFixed(1);

    console.log(
      `✅ ${file} → ${file.replace(".png", ".webp")}: ${(originalSize / 1024).toFixed(0)}KB → ${(webpSize / 1024).toFixed(0)}KB (-${savings}%)`
    );
  } catch (error) {
    console.error(`❌ Error converting ${file}:`, error.message);
  }
}

// Remove duplicate/unused images
const duplicatesToRemove = [
  "alt_ai_chef_1767178878236.png",
  "alt_guests_modern_1767178914133.png",
  "alt_hero_modern_1767178862867.png",
  "alt_shopping_list_1767178891921.png",
];

async function removeDuplicates() {
  console.log("\n🗑️  Removing duplicate images...\n");

  for (const file of duplicatesToRemove) {
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed ${file} (${(size / 1024).toFixed(0)}KB)`);
    }
  }
}

async function main() {
  console.log("\n🖼️  Converting critical images to WebP...\n");

  for (const config of criticalImages) {
    await convertToWebP(config);
  }

  await removeDuplicates();

  // Summary
  console.log("\n📊 Final sizes in /public:");
  const files = fs
    .readdirSync(PUBLIC_DIR)
    .filter((f) => f.endsWith(".png") || f.endsWith(".webp") || f.endsWith(".ico"))
    .sort();

  let totalSize = 0;
  for (const file of files) {
    const size = fs.statSync(path.join(PUBLIC_DIR, file)).size;
    totalSize += size;
  }
  console.log(`\n📦 Total image assets: ${(totalSize / 1024 / 1024).toFixed(2)}MB\n`);
}

main().catch(console.error);
