import { put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { createHash, randomUUID } from "node:crypto";
import { encryptBytes, type EncryptedTicketEnvelope } from "@/lib/crypto";

export const MAX_TICKET_BYTES = 5 * 1024 * 1024;

export const TICKET_PATH_PREFIX = "/sortie/tickets/";

// Volontairement plus restreint que `proof-upload.ts` : pas de HEIC/HEIF.
// Les billets sont quasi-exclusivement des PDF ; les rares billets sous
// forme image arrivent en JPEG/PNG. Refuser HEIC évite la dépendance à
// sharp pour le transcodage et garde le pipeline "upload chiffré" simple.
//
// `.pkpass` (Apple Wallet) est un ZIP signé contenant pass.json + assets.
// `file-type` le détecte juste comme `application/zip` (pas de magic-byte
// dédié) ; on autorise le combo (sniff zip ∧ MIME déclaré pkpass) et on
// stocke le MIME pkpass pour que le download serve avec le bon Content-Type
// — Safari/Mail iOS proposent alors l'ouverture dans Wallet directement.
const PKPASS_MIME = "application/vnd.apple.pkpass";
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  PKPASS_MIME,
]);

export type TicketUploadResult =
  | {
      ok: true;
      blobUrl: string;
      mimeType: string;
      sizeBytes: number;
      checksum: string;
      envelope: EncryptedTicketEnvelope;
    }
  | { ok: false; message: string };

/**
 * Validate (taille + MIME déclaré + magic bytes), chiffre AES-256-GCM, et
 * push le ciphertext sur Vercel Blob. La metadata (keyId, iv, authTag,
 * checksum, mimeType, sizeBytes) est retournée à l'appelant qui la
 * persistera dans `sortie.tickets`. Le ciphertext seul sur le Blob sans
 * sa metadata est inexploitable ; la metadata seule sans la clé env-side
 * (`SORTIE_TICKET_KEY_*`) est aussi inexploitable. Trois facteurs
 * indépendants doivent fuiter pour exposer le contenu d'un billet.
 *
 * Le filename Blob est un UUID + extension neutre `.bin` — l'URL est
 * non-guessable mais elle ne doit JAMAIS être servie au client de toute
 * façon, le download passe exclusivement par /api/tickets/[id]/download
 * qui re-vérifie l'auth + ownership avant de déchiffrer.
 */
export async function uploadTicket(file: File): Promise<TicketUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Fichier vide." };
  }
  if (file.size > MAX_TICKET_BYTES) {
    return { ok: false, message: "Fichier trop lourd (5 Mo max)." };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { ok: false, message: "Format non supporté (PDF, JPEG, PNG, WebP)." };
  }

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
    console.error("[ticket-upload] failed to read file buffer", err);
    return { ok: false, message: "Impossible de lire le fichier — réessaie." };
  }

  const sniff = await fileTypeFromBuffer(buf).catch((err) => {
    console.error("[ticket-upload] file-type sniff failed", err);
    return undefined;
  });

  // pkpass = ZIP magic-byte. file-type retourne "application/zip" — on
  // upgrade vers le MIME pkpass uniquement si le client l'a déclaré
  // explicitement (file.type côté browser).
  const isPkpass = sniff?.mime === "application/zip" && file.type === PKPASS_MIME;
  const storedMime = isPkpass ? PKPASS_MIME : sniff?.mime;

  if (!sniff || !storedMime || !ALLOWED_MIME.has(storedMime)) {
    return { ok: false, message: "Le contenu du fichier ne correspond pas à son type déclaré." };
  }

  const checksum = createHash("sha256").update(buf).digest("hex");
  const sizeBytes = buf.length;

  let envelope: EncryptedTicketEnvelope;
  try {
    envelope = encryptBytes(buf);
  } catch (err) {
    console.error("[ticket-upload] encryption failed", err);
    return {
      ok: false,
      message: "Chiffrement indisponible — la configuration des clés n'est pas prête.",
    };
  }

  // Extension neutre `.bin` — le ciphertext n'est PAS le mime déclaré, il
  // ne doit jamais être rendu directement par le navigateur si l'URL fuite.
  const key = `sortie/tickets/${randomUUID()}.bin`;

  try {
    const blob = await put(key, envelope.ciphertext, {
      // `access: "public"` reste la seule option du SDK Vercel Blob. La
      // confidentialité repose sur :
      //   1. URL non-guessable (UUID v4 dans le path)
      //   2. content non-rendu (octets chiffrés)
      //   3. accès jamais exposé côté client (download via Server Action)
      access: "public",
      // application/octet-stream : aucun navigateur ne tente de rendre ces
      // octets. Le vrai mimeType voyage en DB pour le download authorisé.
      contentType: "application/octet-stream",
      cacheControlMaxAge: 0,
      addRandomSuffix: false,
    });
    return {
      ok: true,
      blobUrl: blob.url,
      mimeType: storedMime,
      sizeBytes,
      checksum,
      envelope,
    };
  } catch (err) {
    console.error("[ticket-upload] blob put failed", err);
    return { ok: false, message: "L'upload a échoué côté serveur. Réessaie dans un instant." };
  }
}
