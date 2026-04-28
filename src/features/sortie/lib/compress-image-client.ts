// Vercel applique un cap dur de 4.5 MB sur le payload des fonctions
// serverless (gateway, non configurable). Au-dessus, la requête est
// rejetée AVANT d'atteindre notre handler avec FUNCTION_PAYLOAD_TOO_LARGE
// — donc impossible à intercepter / messager proprement côté serveur.
// On laisse une marge multipart : cible 4 MB final.
const TARGET_MAX_BYTES = 4 * 1024 * 1024;

// 1920px max sur le côté le plus long. Largement suffisant pour un hero
// 1200×630 (OG) et reste lisible en plein écran sur la page détail. Au-
// delà, on payerait du poids pour des pixels que personne ne voit.
const MAX_DIMENSION = 1920;

const JPEG_QUALITY = 0.85;

/**
 * Compresse une image côté navigateur si elle dépasse la limite Vercel.
 * Stratégie : `<canvas>` resize au plus long côté ≤ 1920px + ré-encodage
 * JPEG q85. Suffisant pour ramener n'importe quelle photo téléphone
 * (5-15 MB) à 0.5-1.5 MB.
 *
 * Best-effort : si le décodage canvas échoue (HEIC sur Chrome p.ex., ou
 * format exotique), on renvoie le fichier original. Le serveur tentera
 * l'upload et soit ça passe (≤ 4.5 MB) soit Vercel renvoie 413 et le
 * picker affiche le message générique. Pas de fail silencieux.
 *
 * Côté client only — utilise `document` et `Image`. Ne pas importer
 * depuis du code serveur.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= TARGET_MAX_BYTES) {
    return file;
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);

    const ratio = Math.min(
      MAX_DIMENSION / img.naturalWidth,
      MAX_DIMENSION / img.naturalHeight,
      1
    );
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) {
      return file;
    }

    // Garde-fou : si le résultat compressé est plus lourd que l'original
    // (cas tordu : PNG sans alpha déjà optimisé > JPEG q85 mal calibré),
    // on conserve l'original. Évite de payer la dégradation pour rien.
    if (blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (err) {
    console.warn("[compress-image-client] decode/compress failed, sending original", err);
    return file;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
