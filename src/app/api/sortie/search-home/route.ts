import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { sanitizeStrictText } from "@/lib/sanitize";
import { escapeLikePattern } from "@/lib/escape-like";
import { searchMyOutings } from "@/features/sortie/queries/search-my-outings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const RESULT_LIMIT = 8;

// Recherche éditoriale dans les sorties de l'user (créées + participantes).
// Per-user → `private` impératif côté Cache-Control pour empêcher tout
// CDN partagé de servir des résultats à un autre user.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const cleaned = sanitizeStrictText(raw, MAX_QUERY_LENGTH);
  if (cleaned.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { outings: [] },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const pattern = escapeLikePattern(cleaned);
  const outings = await searchMyOutings({ userId, q: pattern, limit: RESULT_LIMIT });

  return NextResponse.json(
    { outings },
    {
      headers: {
        "Cache-Control": "private, max-age=0, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
