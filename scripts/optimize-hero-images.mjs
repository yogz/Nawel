import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Hero images to optimize with responsive sizes
const heroImages = [
  { file: "aura-hero.png", baseName: "aura-hero" },
  { file: "alt_hero.png", baseName: "alt_hero" },
  { file: "alt_hero.webp", baseName: "alt_hero" }, // Already WebP, but we'll create AVIF
];

// Responsive sizes for srcset
const sizes = [
  { width: 640, suffix: "640w" },
  { width: 1024, suffix: "1024w" },
  { width: 1920, suffix: "1920w" },
];

async function optimizeHeroImage({ file, baseName }) {
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

    // Generate AVIF and WebP versions for each size
    for (const { width, suffix } of sizes) {
      // Only resize if original is larger than target width
      const shouldResize = metadata.width && metadata.width > width;

      let pipeline = image.clone();
      if (shouldResize) {
        pipeline = pipeline.resize(width, null, {
          withoutEnlargement: true,
          fit: "inside",
        });
      }

      // Generate AVIF (best compression)
      const avifBuffer = await pipeline
        .avif({ quality: 75, effort: 4 })
        .toBuffer();

      const avifPath = path.join(PUBLIC_DIR, `${baseName}-${suffix}.avif`);
      fs.writeFileSync(avifPath, avifBuffer);
      console.log(
        `  ✅ ${baseName}-${suffix}.avif: ${(avifBuffer.length / 1024).toFixed(0)}KB`
      );

      // Generate WebP (fallback)
      const webpBuffer = await pipeline
        .clone()
        .webp({ quality: 80, effort: 6 })
        .toBuffer();

      const webpPath = path.join(PUBLIC_DIR, `${baseName}-${suffix}.webp`);
      fs.writeFileSync(webpPath, webpBuffer);
      console.log(
        `  ✅ ${baseName}-${suffix}.webp: ${(webpBuffer.length / 1024).toFixed(0)}KB`
      );
    }

    // Also create a default size (1920w) without suffix for backward compatibility
    const defaultPipeline = image.clone();
    const shouldResize = metadata.width && metadata.width > 1920;
    const finalPipeline = shouldResize
      ? defaultPipeline.resize(1920, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
      : defaultPipeline;

    // Default AVIF
    const defaultAvif = await finalPipeline.clone().avif({ quality: 75, effort: 4 }).toBuffer();
    const defaultAvifPath = path.join(PUBLIC_DIR, `${baseName}.avif`);
    fs.writeFileSync(defaultAvifPath, defaultAvif);
    console.log(
      `  ✅ ${baseName}.avif (default): ${(defaultAvif.length / 1024).toFixed(0)}KB`
    );

    // Default WebP
    const defaultWebp = await finalPipeline.clone().webp({ quality: 80, effort: 6 }).toBuffer();
    const defaultWebpPath = path.join(PUBLIC_DIR, `${baseName}.webp`);
    fs.writeFileSync(defaultWebpPath, defaultWebp);
    console.log(
      `  ✅ ${baseName}.webp (default): ${(defaultWebp.length / 1024).toFixed(0)}KB`
    );

    const totalSavings = ((originalSize - defaultAvif.length) / originalSize) * 100;
    console.log(
      `  💾 Total savings: ${(originalSize / 1024).toFixed(0)}KB → ${(defaultAvif.length / 1024).toFixed(0)}KB (-${totalSavings.toFixed(1)}%)`
    );
  } catch (error) {
    console.error(`❌ Error optimizing ${file}:`, error.message);
  }
}

async function main() {
  console.log("\n🖼️  Optimizing hero images with responsive sizes...\n");

  for (const config of heroImages) {
    await optimizeHeroImage(config);
  }

  console.log("\n✨ Done! Hero images optimized with AVIF and WebP formats.\n");
  console.log("📝 Next steps:");
  console.log("   - Update HeroSection component to use srcset");
  console.log("   - Add blur placeholders for better LCP\n");
}

main().catch(console.error);
