import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";

// Avatars are smaller than proofs and we never need PDFs. 2 MB is a
// generous cap for a mobile-captured photo after the browser's own
// JPEG compression.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type AvatarUploadResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Validate (size + declared MIME + magic bytes) and push a user avatar
 * to Vercel Blob. The filename is randomised so the URL is unguessable
 * even though the blob is served publicly. Mirror of
 * `uploadPurchaseProof` — same guardrails, different bucket prefix
 * and file-type allowlist.
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Fichier vide." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Photo trop lourde (2 Mo max)." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: "Format non supporté (JPEG, PNG, WebP, HEIC)." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniff = await fileTypeFromBuffer(buf);
  if (!sniff || !ALLOWED_MIME.has(sniff.mime)) {
    return { ok: false, message: "Le contenu du fichier ne correspond pas à son type déclaré." };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: "Upload indisponible — la configuration du stockage n'est pas prête.",
    };
  }

  const key = `sortie/avatars/${randomUUID()}.${sniff.ext}`;
  const blob = await put(key, buf, {
    access: "public",
    contentType: sniff.mime,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    addRandomSuffix: false,
  });
  return { ok: true, url: blob.url };
}
