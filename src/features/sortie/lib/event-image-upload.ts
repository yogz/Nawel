import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { generateOgThumbnail } from "./og-thumbnail";
import { safeFetchExternal } from "./safe-fetch";
import { deleteBlobIfOurs } from "./blob-cleanup";

// Couvres d'événements : on accepte plus large qu'un avatar parce que
// c'est le hero plein-écran de la sortie. 5 MB couvre une photo HD au
// format JPEG sans pousser l'utilisateur à compresser manuellement.
export const MAX_EVENT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

// HEIC/HEIF est l'encodage par défaut des iPhones récents, mais seul
// Safari le rend en <img>. Chrome/Firefox/Edge affichent un cassé. On
// transcode systématiquement vers JPEG côté serveur — sinon l'utilisateur
// voit l'upload "marcher" puis l'image ne s'affiche jamais.
const NEEDS_TRANSCODE_TO_JPEG = new Set(["image/heic", "image/heif"]);

const EVENT_PATH_PREFIX = "/sortie/events/";

export type EventImageUploadResult =
  | { ok: true; url: string; ogUrl: string | null }
  | { ok: false; message: string };

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
  // file.type peut être absent ("") quand le fichier vient d'un partage
  // entre apps mobiles : on s'en remet alors au sniff magic-byte plus bas
  // plutôt que de rejeter sur une heuristique navigateur peu fiable.
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: "Format non supporté (JPEG, PNG, WebP, HEIC)." };
  }

  // Fail fast si le storage n'est pas configuré : inutile de lire le
  // buffer ni de sniffer pour échouer à la fin.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: "Upload indisponible — la configuration du stockage n'est pas prête.",
    };
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error("[event-image-upload] failed to read file buffer", err);
    return { ok: false, message: "Impossible de lire le fichier — réessaie." };
  }

  const sniff = await fileTypeFromBuffer(buf).catch((err) => {
    console.error("[event-image-upload] file-type sniff failed", err);
    return undefined;
  });
  if (!sniff || !ALLOWED_MIME.has(sniff.mime)) {
    return {
      ok: false,
      message: "Le contenu du fichier ne correspond pas à son type déclaré.",
    };
  }

  // HEIC/HEIF → JPEG : indispensable pour que Chrome/Firefox/Edge rendent
  // l'image. On profite de ce passage pour appliquer aussi `rotate()`
  // (respecte l'EXIF orientation) et nettoyer les métadonnées.
  let storedMime = sniff.mime;
  let storedExt = sniff.ext;
  if (NEEDS_TRANSCODE_TO_JPEG.has(sniff.mime)) {
    try {
      buf = await sharp(buf).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      storedMime = "image/jpeg";
      storedExt = "jpg";
    } catch (err) {
      console.error("[event-image-upload] HEIC/HEIF transcode failed", err);
      return {
        ok: false,
        message: "Impossible de convertir cette image — réessaie en JPEG ou PNG.",
      };
    }
  }

  try {
    const id = randomUUID();
    const originalKey = `sortie/events/${id}.${storedExt}`;
    const ogKey = `sortie/events/${id}-og.jpg`;

    // Original + OG thumb pushed in parallel. Failing the thumb is not a
    // blocker — the renderer will fall back on the original at OG time
    // and just risk a dropped WhatsApp preview if the source is heavy.
    const [original, ogThumb] = await Promise.all([
      put(originalKey, buf, {
        access: "public",
        contentType: storedMime,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
        addRandomSuffix: false,
      }),
      generateOgThumbnail(buf)
        .then((thumb) =>
          put(ogKey, thumb, {
            access: "public",
            contentType: "image/jpeg",
            cacheControlMaxAge: 60 * 60 * 24 * 365,
            addRandomSuffix: false,
          })
        )
        .catch((err: unknown) => {
          console.error("[event-image-upload] og thumb generation failed", err);
          return null;
        }),
    ]);

    return { ok: true, url: original.url, ogUrl: ogThumb?.url ?? null };
  } catch (err) {
    console.error("[event-image-upload] blob put failed", err);
    return {
      ok: false,
      message: "L'upload a échoué côté serveur. Réessaie dans un instant.",
    };
  }
}

/**
 * Best-effort cleanup of an event image that's just been replaced or
 * removed. Mirror of `deletePreviousAvatar` — same paranoid host +
 * prefix check so we never delete a foreign CDN URL accidentally
 * stored in `heroImageUrl`. Pass both `url` and `ogUrl` to wipe
 * the original and its OG companion in one call.
 *
 * Failures are logged at warning level only: the new image is
 * already saved by the time we get here, so a failed cleanup just
 * leaves a blob orphan that a periodic audit can sweep.
 */
export async function deletePreviousEventImage(
  url: string | null,
  ogUrl: string | null
): Promise<void> {
  await Promise.all([
    deleteBlobIfOurs(url, EVENT_PATH_PREFIX, "event-image-upload"),
    deleteBlobIfOurs(ogUrl, EVENT_PATH_PREFIX, "event-image-upload"),
  ]);
}

// Hard cap on how many bytes we'll pull from a third-party CDN when
// preparing an OG thumbnail from a parsed ticket page. Past this we
// abort: a 20 MB poster would push sharp memory use through the roof
// and is almost certainly a misclassified video or PDF anyway.
const MAX_REMOTE_FETCH_BYTES = 8 * 1024 * 1024;
const REMOTE_FETCH_TIMEOUT_MS = 6000;

/**
 * Fetch a remote image (e.g. a Ticketmaster `og:image`), validate its
 * MIME against the same allowlist as user uploads, then re-encode it
 * into a 1200×630 JPEG hosted on Vercel Blob. Returns the blob URL on
 * success, `null` on any failure mode (timeout, oversized, wrong MIME,
 * sharp choke). Best-effort: the caller stores `null` and the OG
 * renderer falls back on the original remote URL.
 *
 * Tourne en runtime Node uniquement (sharp + Buffer).
 */
export async function generateOgThumbnailFromRemoteUrl(remoteUrl: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }

  // safeFetchExternal protège contre le SSRF (DNS rebind, IPs privées,
  // redirections vers loopback) — nécessaire car remoteUrl vient d'une
  // page tiers parsée (parse-ticket-url) ou d'un og:image utilisateur.
  const fetched = await safeFetchExternal(remoteUrl, {
    timeoutMs: REMOTE_FETCH_TIMEOUT_MS,
    maxBytes: MAX_REMOTE_FETCH_BYTES,
  });
  if (!fetched.ok) {
    if (fetched.reason !== "blocked_host" && fetched.reason !== "too_large") {
      console.warn("[event-image-upload] remote fetch failed for og thumb", {
        reason: fetched.reason,
        remoteUrl,
      });
    }
    return null;
  }
  const buf = fetched.body;

  const sniff = await fileTypeFromBuffer(buf).catch(() => undefined);
  if (!sniff || !ALLOWED_MIME.has(sniff.mime)) {
    return null;
  }

  let thumbBuf: Buffer;
  try {
    thumbBuf = await generateOgThumbnail(buf);
  } catch (err) {
    console.warn("[event-image-upload] sharp choke on remote og thumb", { err, remoteUrl });
    return null;
  }

  try {
    const thumb = await put(`sortie/events/${randomUUID()}-og.jpg`, thumbBuf, {
      access: "public",
      contentType: "image/jpeg",
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      addRandomSuffix: false,
    });
    return thumb.url;
  } catch (err) {
    console.warn("[event-image-upload] blob put failed for remote og thumb", { err, remoteUrl });
    return null;
  }
}
