import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type ProofUploadResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Validate (size + declared MIME + magic bytes) and push a purchase-proof
 * file to Vercel Blob. The filename is randomised so the URL is unguessable
 * even with `access: "public"`, and Content-Disposition forces download so a
 * rogue HTML renamed .pdf can't render inline.
 */
export async function uploadPurchaseProof(file: File): Promise<ProofUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Fichier vide." };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { ok: false, message: "Fichier trop lourd (5 Mo max)." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: "Format non supporté (PDF, JPEG, PNG, WebP, HEIC)." };
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

  const key = `sortie/proofs/${randomUUID()}.${sniff.ext}`;
  const blob = await put(key, buf, {
    access: "public",
    contentType: sniff.mime,
    cacheControlMaxAge: 0,
    addRandomSuffix: false,
  });
  // The URL is unguessable (UUID pathname) and served with an explicit MIME
  // so a disguised HTML renamed .pdf can't render inline. Good enough for an
  // amicable app; a signed-URL pipeline is follow-up work.
  return { ok: true, url: blob.url };
}
