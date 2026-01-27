import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Hero images to generate blur placeholders for
const heroImages = [
  { file: "aura-hero.png", baseName: "aura-hero" },
  { file: "alt_hero.png", baseName: "alt_hero" },
  { file: "alt_hero.webp", baseName: "alt_hero" },
];

/**
 * Generate a tiny blur placeholder (10x10) and return as base64 data URL
 */
async function generateBlurPlaceholder({ file, baseName }) {
  const inputPath = path.join(PUBLIC_DIR, file);

  if (!fs.existsSync(inputPath)) {
    console.log(`⏭️  Skipping ${file} (not found)`);
    return null;
  }

  try {
    // Generate a 10x10 pixel version
    const placeholderBuffer = await sharp(inputPath)
      .resize(10, 10, { fit: "cover" })
      .webp({ quality: 20 })
      .toBuffer();

    // Convert to base64 data URL
    const base64 = placeholderBuffer.toString("base64");
    const dataUrl = `data:image/webp;base64,${base64}`;

    // Save to a JSON file for import in the app
    const outputPath = path.join(process.cwd(), "src", "data", "blur-placeholders.json");
    let placeholders = {};

    if (fs.existsSync(outputPath)) {
      placeholders = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    }

    placeholders[baseName] = dataUrl;

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(placeholders, null, 2));

    console.log(`✅ Generated blur placeholder for ${baseName} (${dataUrl.length} chars)`);
    return dataUrl;
  } catch (error) {
    console.error(`❌ Error generating placeholder for ${file}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("\n🎨 Generating blur placeholders for hero images...\n");

  for (const config of heroImages) {
    await generateBlurPlaceholder(config);
  }

  console.log("\n✨ Done! Blur placeholders saved to src/data/blur-placeholders.json\n");
  console.log("📝 Next step: Import and use in OptimizedHeroImage component\n");
}

main().catch(console.error);
