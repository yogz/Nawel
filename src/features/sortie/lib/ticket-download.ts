import { createHash } from "node:crypto";
import { decryptBytes, type EncryptedTicketEnvelope } from "@/lib/crypto";

export type TicketDownloadEnvelope = EncryptedTicketEnvelope;

export type TicketDownloadInput = {
  blobUrl: string;
  encryptionKeyId: string;
  iv: string;
  authTag: string;
  expectedChecksum: string;
};

/**
 * Fetch le ciphertext depuis Vercel Blob, le déchiffre via la clé indiquée
 * dans l'envelope, et vérifie le SHA-256 du plaintext contre le checksum
 * stocké à l'upload.
 *
 * Trois failsafes successifs :
 *   1. fetch d'un Blob inattendu → `not_found`
 *   2. authTag GCM invalide → throw côté `decryptBytes` (capturé en `decrypt_failed`)
 *   3. checksum mismatch → `checksum_mismatch` (le tag couvre déjà l'intégrité,
 *      mais on garde le check pour repérer les bugs de re-encryption / migration)
 */
export type TicketDownloadResult =
  | { ok: true; plaintext: Buffer }
  | { ok: false; reason: "not_found" | "decrypt_failed" | "checksum_mismatch" };

export async function downloadAndDecryptTicket(
  input: TicketDownloadInput
): Promise<TicketDownloadResult> {
  let response: Response;
  try {
    response = await fetch(input.blobUrl, { cache: "no-store" });
  } catch (err) {
    console.error("[ticket-download] fetch failed", err);
    return { ok: false, reason: "not_found" };
  }
  if (!response.ok) {
    console.warn("[ticket-download] blob unreachable", {
      status: response.status,
      blobUrl: input.blobUrl,
    });
    return { ok: false, reason: "not_found" };
  }

  const ciphertext = Buffer.from(await response.arrayBuffer());

  let plaintext: Buffer;
  try {
    plaintext = decryptBytes({
      keyId: input.encryptionKeyId,
      iv: input.iv,
      authTag: input.authTag,
      ciphertext,
    });
  } catch (err) {
    console.error("[ticket-download] decrypt failed", err);
    return { ok: false, reason: "decrypt_failed" };
  }

  const actualChecksum = createHash("sha256").update(plaintext).digest("hex");
  if (actualChecksum !== input.expectedChecksum) {
    console.error("[ticket-download] checksum mismatch", {
      expected: input.expectedChecksum,
      actual: actualChecksum,
    });
    return { ok: false, reason: "checksum_mismatch" };
  }

  return { ok: true, plaintext };
}
