import sharp from "sharp";

// 1200×630 = 1.91:1, le ratio que WhatsApp/iMessage/Twitter "summary_large_image"
// affichent en preview large. Toute autre dimension dégrade en thumbnail carrée.
export const OG_THUMB_WIDTH = 1200;
export const OG_THUMB_HEIGHT = 630;

// Cible : < 200 KB pour rester confortablement sous le seuil 300 KB
// au-delà duquel WhatsApp drop silencieusement les previews. Q72 +
// mozjpeg + 4:2:0 chroma subsampling produit ~50-130 KB sur des photos
// d'événement standard.
const JPEG_QUALITY = 72;

/**
 * Crop + resize + recompress une image source en JPEG 1200×630
 * optimisé pour preview WhatsApp. La stratégie `attention` (entropy
 * smart-crop) garde la zone visuellement la plus saillante quand on
 * doit rogner — typiquement les visages ou le sujet central plutôt
 * que des bords vides.
 *
 * Tourne uniquement en runtime Node (sharp est un binary natif), à
 * appeler depuis les server actions / route handlers, jamais depuis
 * un fichier `runtime = "edge"`.
 */
export async function generateOgThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(OG_THUMB_WIDTH, OG_THUMB_HEIGHT, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
      chromaSubsampling: "4:2:0",
    })
    .toBuffer();
}
