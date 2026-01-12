import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Images to optimize with their target settings
const imagesToOptimize = [
  // Critical landing page images (LCP elements)
  { file: "alt_hero.png", maxWidth: 1200, quality: 75 },
  { file: "alt_ai_chef.png", maxWidth: 1000, quality: 70 },
  { file: "alt_guests.png", maxWidth: 1000, quality: 70 },
  { file: "alt_shopping.png", maxWidth: 1000, quality: 70 },
  // Aura images
  { file: "aura-ai.png", maxWidth: 1000, quality: 70 },
  { file: "aura-hero.png", maxWidth: 1000, quality: 70 },
  { file: "aura-checklist.png", maxWidth: 1000, quality: 70 },
  { file: "aura-collaboration.png", maxWidth: 1000, quality: 70 },
  { file: "aura-menu.png", maxWidth: 1000, quality: 70 },
  // Story images
  { file: "story_hero.png", maxWidth: 1000, quality: 70 },
  { file: "story_guests.png", maxWidth: 1000, quality: 70 },
  { file: "story_shopping.png", maxWidth: 1000, quality: 70 },
  { file: "story_inspiration.png", maxWidth: 1000, quality: 70 },
  // Logo and icons (smaller, higher quality)
  { file: "LogoIcon.png", maxWidth: 512, quality: 85 },
  { file: "LogoText.png", maxWidth: 400, quality: 85 },
  { file: "og-image.png", maxWidth: 800, quality: 80 },
];

async function optimizeImage({ file, maxWidth, quality }) {
  const inputPath = path.join(PUBLIC_DIR, file);

  if (!fs.existsSync(inputPath)) {
    console.log(`⏭️  Skipping ${file} (not found)`);
    return;
  }

  const originalSize = fs.statSync(inputPath).size;
  const outputPath = inputPath; // Overwrite original

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Only resize if larger than maxWidth
    const shouldResize = metadata.width && metadata.width > maxWidth;

    let pipeline = image;
    if (shouldResize) {
      pipeline = pipeline.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: "inside"
      });
    }

    // Output as optimized PNG (keeping format for compatibility)
    const buffer = await pipeline
      .png({
        quality,
        compressionLevel: 9,
        palette: true // Use palette-based PNG when possible
      })
      .toBuffer();

    fs.writeFileSync(outputPath, buffer);

    const newSize = buffer.length;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`✅ ${file}: ${(originalSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB (-${savings}%)`);
  } catch (error) {
    console.error(`❌ Error optimizing ${file}:`, error.message);
  }
}

async function createOptimizedFavicon() {
  const inputPath = path.join(PUBLIC_DIR, "LogoIcon.png");
  const faviconPath = path.join(PUBLIC_DIR, "favicon.ico");

  if (!fs.existsSync(inputPath)) {
    console.log("⏭️  Skipping favicon (LogoIcon.png not found)");
    return;
  }

  try {
    // Create a 32x32 PNG for favicon
    const buffer = await sharp(inputPath)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer();

    // Note: This creates a PNG, not a true ICO. For proper ICO, you'd need ico-encoder
    // But browsers accept PNG favicons via <link rel="icon" type="image/png">
    const favicon32Path = path.join(PUBLIC_DIR, "favicon-32x32.png");
    fs.writeFileSync(favicon32Path, buffer);

    const originalSize = fs.existsSync(faviconPath) ? fs.statSync(faviconPath).size : 0;
    console.log(`✅ favicon-32x32.png created: ${(buffer.length/1024).toFixed(0)}KB (original ico was ${(originalSize/1024).toFixed(0)}KB)`);
  } catch (error) {
    console.error("❌ Error creating favicon:", error.message);
  }
}

async function createPWAIcons() {
  const inputPath = path.join(PUBLIC_DIR, "LogoIcon.png");

  if (!fs.existsSync(inputPath)) {
    console.log("⏭️  Skipping PWA icons (LogoIcon.png not found)");
    return;
  }

  const sizes = [192, 512];

  for (const size of sizes) {
    try {
      const buffer = await sharp(inputPath)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ quality: 85, compressionLevel: 9 })
        .toBuffer();

      const outputPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ icon-${size}.png: ${(buffer.length/1024).toFixed(0)}KB`);
    } catch (error) {
      console.error(`❌ Error creating icon-${size}.png:`, error.message);
    }
  }
}

async function main() {
  console.log("\n🖼️  Optimizing images...\n");

  for (const config of imagesToOptimize) {
    await optimizeImage(config);
  }

  console.log("\n🎨 Creating optimized favicon and PWA icons...\n");
  await createOptimizedFavicon();
  await createPWAIcons();

  console.log("\n✨ Done!\n");
}

main().catch(console.error);
