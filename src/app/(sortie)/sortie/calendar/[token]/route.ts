import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { feedOutingsForUser } from "@/features/sortie/queries/outing-queries";
import { buildIcsFeed } from "@/features/sortie/lib/build-ics-feed";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

/**
 * Flux iCalendar personnel — agrège toutes les sorties RSVP yes /
 * handle_own + créées par l'utilisateur, polled périodiquement par
 * son client Calendar (Apple, Google, Outlook, Proton).
 *
 * URL : `https://sortie.colist.fr/calendar/<token>.ics`
 *
 * Auth : le token EST le bearer. Pas de session, pas de cookie. Le
 * token est généré côté `/moi` et stocké dans `user.calendar_token`
 * (unique, secret). Si l'utilisateur leak son URL, il peut rotater
 * via le même endroit. 404 silencieux sur token inconnu — ne leak
 * pas l'existence d'un user.
 *
 * Cache : 5 min côté CDN. Les apps Calendar polish 15 min - 24h
 * selon le client, donc 5 min est OK pour propager les updates dès
 * qu'elles arrivent (création, RSVP, modif date, annulation).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;

  // Le path est `/calendar/<token>.ics` — on retire le suffixe .ics
  // que les clients Calendar ajoutent souvent (Apple Calendar
  // notamment exige ce suffixe pour ouvrir le prompt de subscription).
  const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -".ics".length) : rawToken;

  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 });
  }

  const u = await db.query.user.findFirst({
    where: eq(user.calendarToken, token),
    columns: { id: true, banned: true, name: true },
  });

  if (!u || u.banned) {
    return new NextResponse("Not found", { status: 404 });
  }

  const outings = await feedOutingsForUser(u.id);

  const ics = buildIcsFeed({
    outings,
    publicBase: PUBLIC_BASE,
    calendarName: `Sortie · ${u.name}`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // `inline` (pas attachment) pour que les clients Calendar
      // qui font un GET direct (Apple via webcal://) traitent la
      // réponse comme un feed à parser plutôt qu'un download.
      "Content-Disposition": `inline; filename="sortie-${u.id}.ics"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      // Empêche les bots qui passent sur les feeds publics. Si tu
      // veux un crawler indexer, à enlever — mais un feed perso
      // n'a pas vocation à être indexé.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
