import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Feature images to optimize
const featureImages = [
  { file: "aura-collaboration.png", baseName: "aura-collaboration" },
  { file: "aura-checklist.png", baseName: "aura-checklist" },
  { file: "aura-ai.png", baseName: "aura-ai" },
  { file: "aura-menu.png", baseName: "aura-menu" },
  // These are already WebP, but we'll create AVIF versions
  { file: "alt_ai_chef.webp", baseName: "alt_ai_chef" },
  { file: "alt_guests.webp", baseName: "alt_guests" },
  { file: "alt_shopping.webp", baseName: "alt_shopping" },
];

async function optimizeFeatureImage({ file, baseName }) {
  const inputPath = path.join(PUBLIC_DIR, file);

  if (!fs.existsSync(inputPath)) {
    console.log(`⏭️  Skipping ${file} (not found)`);
    return;
  }

  const originalSize = fs.statSync(inputPath).size;
  console.log(`\n📸 Processing ${file} (${(originalSize / 1024).toFixed(0)}KB)...`);

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Max width for feature images (they're displayed at 50vw max)
    const maxWidth = 1200;

    // Resize if needed
    let pipeline = image.clone();
    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    // Generate AVIF (best compression)
    const avifBuffer = await pipeline.clone().avif({ quality: 75, effort: 4 }).toBuffer();
    const avifPath = path.join(PUBLIC_DIR, `${baseName}.avif`);
    fs.writeFileSync(avifPath, avifBuffer);
    console.log(`  ✅ ${baseName}.avif: ${(avifBuffer.length / 1024).toFixed(0)}KB`);

    // Generate WebP (fallback) - only if original is PNG
    if (file.endsWith(".png")) {
      const webpBuffer = await pipeline.clone().webp({ quality: 80, effort: 6 }).toBuffer();
      const webpPath = path.join(PUBLIC_DIR, `${baseName}.webp`);
      fs.writeFileSync(webpPath, webpBuffer);
      console.log(`  ✅ ${baseName}.webp: ${(webpBuffer.length / 1024).toFixed(0)}KB`);
    }

    const savings = ((originalSize - avifBuffer.length) / originalSize) * 100;
    console.log(
      `  💾 Savings: ${(originalSize / 1024).toFixed(0)}KB → ${(avifBuffer.length / 1024).toFixed(0)}KB (-${savings.toFixed(1)}%)`
    );
  } catch (error) {
    console.error(`❌ Error optimizing ${file}:`, error.message);
  }
}

async function main() {
  console.log("\n🖼️  Optimizing feature images...\n");

  for (const config of featureImages) {
    await optimizeFeatureImage(config);
  }

  console.log("\n✨ Done! Feature images optimized with AVIF and WebP formats.\n");
  console.log("📝 Next step: Update FeatureCard component to use optimized formats with lazy loading\n");
}

main().catch(console.error);
