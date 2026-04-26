import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";

// Couvres d'événements : on accepte plus large qu'un avatar parce que
// c'est le hero plein-écran de la sortie. 5 MB couvre une photo HD au
// format JPEG sans pousser l'utilisateur à compresser manuellement.
export const MAX_EVENT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type EventImageUploadResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Validate (taille + MIME déclaré + magic bytes) et push une cover
 * d'événement vers Vercel Blob. Mirror de `uploadAvatar` mais sous le
 * préfixe `/sortie/events/` pour que le cleanup ne mélange pas les
 * buckets. Le filename est randomisé (UUID) — l'URL est publique mais
 * non guessable.
 *
 * Cas d'orphelins : si l'utilisateur abandonne le wizard après upload,
 * la blob reste. Le coût est négligeable (quelques KB par sortie
 * abandonnée) ; un script de purge des blobs > 24h non référencés dans
 * `outings.heroImageUrl` peut être ajouté plus tard si besoin.
 */
export async function uploadEventImage(file: File): Promise<EventImageUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Fichier vide." };
  }
  if (file.size > MAX_EVENT_IMAGE_BYTES) {
    return { ok: false, message: "Image trop lourde (5 Mo max)." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: "Format non supporté (JPEG, PNG, WebP, HEIC)." };
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error("[event-image-upload] failed to read file buffer", err);
    return { ok: false, message: "Impossible de lire le fichier — réessaie." };
  }

  let sniff: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    sniff = await fileTypeFromBuffer(buf);
  } catch (err) {
    console.error("[event-image-upload] file-type sniff failed", err);
    return { ok: false, message: "Ce format d'image n'est pas supporté." };
  }
  if (!sniff || !ALLOWED_MIME.has(sniff.mime)) {
    return {
      ok: false,
      message: "Le contenu du fichier ne correspond pas à son type déclaré.",
    };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: "Upload indisponible — la configuration du stockage n'est pas prête.",
    };
  }

  try {
    const key = `sortie/events/${randomUUID()}.${sniff.ext}`;
    const blob = await put(key, buf, {
      access: "public",
      contentType: sniff.mime,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
  } catch (err) {
    console.error("[event-image-upload] blob put failed", err);
    return {
      ok: false,
      message: "L'upload a échoué côté serveur. Réessaie dans un instant.",
    };
  }
}
