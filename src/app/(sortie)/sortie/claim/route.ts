import { and, eq, gt, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { magicLinks, outings } from "@drizzle/sortie-schema";
import { ensureParticipantTokenHash, hashToken } from "@/features/sortie/lib/cookie-token";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";

const SORTIE_BASE = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return redirectTo("/?claim=missing");
  }

  const tokenHash = hashToken(token);

  // Atomic consume: mark the link used only if it's still fresh and untouched.
  // Returns nothing when the link is expired, already used, or unknown — all
  // three collapse into the same user-facing error.
  const [consumed] = await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(magicLinks.tokenHash, tokenHash),
        isNull(magicLinks.usedAt),
        gt(magicLinks.expiresAt, new Date())
      )
    )
    .returning({ outingId: magicLinks.outingId });

  if (!consumed) {
    return redirectTo("/?claim=invalid");
  }

  // Look up the outing to know where to send the user and to flip the
  // creator's device-hash column. Reuses ensureParticipantTokenHash so the
  // new device gets a cookie on first visit.
  const outing = await db.query.outings.findFirst({
    where: eq(outings.id, consumed.outingId),
  });
  if (!outing) {
    return redirectTo("/?claim=missing");
  }

  const cookieTokenHash = await ensureParticipantTokenHash();
  await db
    .update(outings)
    .set({ creatorCookieTokenHash: cookieTokenHash, updatedAt: new Date() })
    .where(eq(outings.id, outing.id));

  const path = `/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}?claim=ok`;
  return redirectTo(path);
}

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, SORTIE_BASE));
}
