import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { auditLog } from "@drizzle/sortie-schema";
import { hashIp, TICKET_AUDIT_ACTION } from "@/features/sortie/lib/audit";
import { authorizeTicketAccess } from "@/features/sortie/lib/ticket-auth";
import { downloadAndDecryptTicket } from "@/features/sortie/lib/ticket-download";
import { getClientIp, rateLimit } from "@/features/sortie/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extFromMime(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType === "application/vnd.apple.pkpass") {
    return "pkpass";
  }
  return mimeType.split("/")[1] ?? "bin";
}

/**
 * Strip seulement ce qui peut casser le header HTTP : guillemets doubles,
 * backslash, CR, LF, slash (path injection). Conserve lettres Unicode,
 * chiffres, espaces, ponctuation usuelle. Le non-ASCII restant est porté
 * par `filename*=UTF-8'…` côté header (RFC 5987).
 */
function sanitizeFilenameStem(input: string): string | null {
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (ch === '"' || ch === "\\" || ch === "/" || ch === "\r" || ch === "\n" || code < 32) {
      continue;
    }
    out += ch;
  }
  out = out.trim();
  return out.length > 0 ? out.slice(0, 100) : null;
}

function buildContentDisposition(
  candidates: { customLabel: string | null; originalFilename: string | null },
  mimeType: string
): string {
  const ext = extFromMime(mimeType);
  const fallback = `billet.${ext}`;

  const stem = candidates.customLabel
    ? sanitizeFilenameStem(candidates.customLabel)
    : candidates.originalFilename
      ? sanitizeFilenameStem(candidates.originalFilename)
      : null;

  const filename = stem ? (/\.[a-z0-9]{1,5}$/i.test(stem) ? stem : `${stem}.${ext}`) : fallback;

  // RFC 5987 : filename* porte le nom natif (accents), filename= ASCII-only
  // sert de fallback (les non-ASCII deviennent '_'). Inline pourrait laisser
  // un PDF malveillant exécuter du JS dans notre origin — toujours attachment.
  let asciiSafe = "";
  for (const ch of filename) {
    const code = ch.charCodeAt(0);
    asciiSafe += code >= 32 && code <= 126 ? ch : "_";
  }
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8}`;
}

/**
 * Télécharge un billet déchiffré pour un user authentifié et autorisé.
 *
 * Pipeline :
 *   1. Rate limit per-user (anti-bot scan + anti-abuse)
 *   2. Récupération de la session Better Auth
 *   3. authorizeTicketAccess : ticket existe, non révoqué, sortie non
 *      annulée, créateur loggé, scope match (owner / organizer /
 *      participant actif pour scope='outing')
 *   4. Fetch ciphertext sur Vercel Blob, déchiffrement AES-256-GCM,
 *      vérification du checksum SHA-256
 *   5. Audit log (success ou denied)
 *   6. Stream avec Content-Disposition: attachment
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: ticketId } = await params;
  if (!ticketId || !/^[0-9a-f-]{36}$/i.test(ticketId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const sessionUserId = session?.user?.id ?? null;

  // Rate limit avant de lire la DB : un attaquant non-loggué qui scanne les
  // UUIDs ne doit pas pouvoir mesurer les latences (ticket existe-t-il ?).
  const rlKey = sessionUserId ? `user:${sessionUserId}` : `ip:${await getClientIp()}`;
  const gate = await rateLimit({
    key: `ticket-download:${rlKey}`,
    limit: 60,
    windowSeconds: 600,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: "rate_limited", message: gate.message }, { status: 429 });
  }

  const { decision, ticket } = await authorizeTicketAccess({
    ticketId,
    sessionUserId,
  });

  if (!decision.ok) {
    // Limiter l'audit aux denies "informatifs" — un 401/404 anonyme n'a
    // aucune valeur d'enquête et inonderait la table.
    if (
      ticket &&
      sessionUserId &&
      (decision.reason === "not_authorized" || decision.reason === "revoked")
    ) {
      await db
        .insert(auditLog)
        .values({
          outingId: ticket.outingId,
          actorUserId: sessionUserId,
          action: TICKET_AUDIT_ACTION.TICKET_DOWNLOAD_DENIED,
          ipHash: await hashIp(),
          payload: JSON.stringify({ ticketId, reason: decision.reason }),
        })
        .catch((err) => {
          console.warn("[ticket-download-route] audit denied insert failed", err);
        });
    }
    if (decision.reason === "no_session_user") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (decision.reason === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (decision.reason === "revoked") {
      return NextResponse.json({ error: "gone" }, { status: 410 });
    }
    if (decision.reason === "outing_cancelled") {
      return NextResponse.json({ error: "outing_cancelled" }, { status: 410 });
    }
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!ticket) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const result = await downloadAndDecryptTicket({
    blobUrl: ticket.blobUrl,
    encryptionKeyId: ticket.encryptionKeyId,
    iv: ticket.iv,
    authTag: ticket.authTag,
    expectedChecksum: ticket.checksum,
  });
  if (!result.ok) {
    console.error("[ticket-download-route] decrypt pipeline failed", {
      ticketId,
      reason: result.reason,
    });
    return NextResponse.json({ error: "internal_error", reason: result.reason }, { status: 500 });
  }

  // Fire-and-forget : pas besoin d'attendre l'audit pour servir le binaire.
  void db
    .insert(auditLog)
    .values({
      outingId: ticket.outingId,
      actorUserId: sessionUserId,
      action: TICKET_AUDIT_ACTION.TICKET_DOWNLOADED,
      ipHash: await hashIp(),
      payload: JSON.stringify({
        ticketId,
        scope: ticket.scope,
        reason: decision.reason,
      }),
    })
    .catch((err) => {
      console.warn("[ticket-download-route] audit success insert failed", err);
    });

  return new Response(new Uint8Array(result.plaintext), {
    status: 200,
    headers: {
      "Content-Type": ticket.mimeType,
      "Content-Length": String(result.plaintext.length),
      "Content-Disposition": buildContentDisposition(
        { customLabel: ticket.customLabel, originalFilename: ticket.originalFilename },
        ticket.mimeType
      ),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
