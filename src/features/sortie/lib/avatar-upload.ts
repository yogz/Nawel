import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import { deleteBlobIfOurs } from "./blob-cleanup";

// Avatars are smaller than proofs and we never need PDFs. 2 MB is a
// generous cap for a mobile-captured photo after the browser's own
// JPEG compression.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const AVATAR_PATH_PREFIX = "/sortie/avatars/";

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

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error("[avatar-upload] failed to read file buffer", err);
    return { ok: false, message: "Impossible de lire le fichier — réessaie." };
  }

  let sniff: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    sniff = await fileTypeFromBuffer(buf);
  } catch (err) {
    console.error("[avatar-upload] file-type sniff failed", err);
    return { ok: false, message: "Ce format d'image n'est pas supporté." };
  }
  if (!sniff || !ALLOWED_MIME.has(sniff.mime)) {
    return { ok: false, message: "Le contenu du fichier ne correspond pas à son type déclaré." };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: "Upload indisponible — la configuration du stockage n'est pas prête.",
    };
  }

  try {
    const key = `sortie/avatars/${randomUUID()}.${sniff.ext}`;
    const blob = await put(key, buf, {
      access: "public",
      contentType: sniff.mime,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
  } catch (err) {
    // Vercel Blob: invalid/revoked token, quota, network, bucket
    // misconfig — log the detail server-side, show the user a
    // sentence they can act on.
    console.error("[avatar-upload] blob put failed", err);
    return {
      ok: false,
      message: "L'upload a échoué côté serveur. Réessaie dans un instant.",
    };
  }
}

/**
 * Best-effort cleanup of an avatar that's just been replaced. Skips
 * silently when the URL is empty, foreign (e.g. Better Auth's Google
 * `lh3.googleusercontent.com`), or not in our avatars prefix —
 * nothing to delete in any of those cases. The caller is expected to
 * fire-and-forget via `after()` so the user's response time doesn't
 * pay for the cleanup.
 *
 * Failures are logged at warning level only — the new avatar is
 * already saved by the time we get here, so a failed cleanup just
 * means an orphan that the periodic audit script will pick up.
 * Throwing would be a regression, not a fix.
 */
export async function deletePreviousAvatar(url: string | null): Promise<void> {
  await deleteBlobIfOurs(url, AVATAR_PATH_PREFIX, "avatar-upload");
}
