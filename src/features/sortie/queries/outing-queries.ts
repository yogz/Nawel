import { cache } from "react";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  getTableColumns,
  gt,
  gte,
  inArray,
  lte,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, outingTimeslots, participants, timeslotVotes } from "@drizzle/sortie-schema";
import { user } from "@drizzle/schema";
import { AGENDA_WINDOW_DAYS } from "@/features/sortie/lib/agenda-grid";
import type { FeedOuting } from "@/features/sortie/lib/build-ics-feed";

// Fenêtre de rétention historique pour le flux iCal personnel : on garde
// les sorties past des 30 derniers jours (utile pour relancer un paiement
// ou retrouver les détails d'une sortie récente). Au-delà, on considère
// que ça pollue l'agenda du user — il peut toujours retrouver ses
// anciennes sorties via /moi.
const FEED_HISTORY_WINDOW_DAYS = 30;

// Sub-query scalaire réutilisée par les listings (profile + feed + admin) :
// compte des participants ayant répondu yes ou handle_own pour une
// sortie donnée. Préféré au LEFT JOIN + GROUP BY pour rester composable
// avec ORDER BY / LIMIT au niveau de l'outing.
//
// IMPORTANT : on qualifie explicitement les colonnes avec
// `${participants}.…` et `${outings}.…` plutôt que `${participants.outingId}`
// (qui génère un nom de colonne nu). Sans qualif, le `${outings.id}` du
// sub-select corrélé est inliné comme `"id"` brut, qui collide avec la
// colonne `id` de `participants` au scope du sub-query — résultat : la
// jointure devient `outing_id = participants.id` (toujours faux) et le
// COUNT renvoie 0 partout. Bug subtil qui était caché tant que personne
// n'inspectait les compteurs réels.
export const confirmedCountSql = sql<number>`(
  SELECT COUNT(*)::int FROM ${participants}
  WHERE ${participants}.outing_id = ${outings}.id
    AND ${participants}.response IN ('yes', 'handle_own')
)`;

// `React.cache` dédoublonne par requête : `getOutingByShortId(shortId)` est
// appelé 2x sur la même page detail (generateMetadata + Page) et jusqu'à
// 8x à travers les sub-routes (modifier, achat, dettes, paiement, agenda).
// Sans cache, c'est 2 round-trips DB identiques par requête. La memo est
// scopée à la requête — pas de stale entre utilisateurs.
export const getOutingByShortId = cache(async (shortId: string) => {
  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
    with: {
      // Creator's display name for share-preview copy ("Léa t'invite…").
      // Anon creators use `creatorAnonName` instead — the og-meta helper
      // picks whichever is set.
      creatorUser: { columns: { name: true, username: true } },
      participants: {
        orderBy: [asc(participants.respondedAt)],
        // Logged-in participants have `anonName = null` — their display name
        // lives in the `user` table. Joining it here keeps the UI layer from
        // falling back to "Quelqu'un" for creators who auto-RSVP themselves.
        with: { user: { columns: { name: true, image: true } } },
      },
      // Cheap to always fetch — fixed outings just return an empty array.
      // Votes are joined nested so the voting UI can tally per-timeslot in
      // a single render without hitting the DB again.
      timeslots: {
        orderBy: [asc(outingTimeslots.position), asc(outingTimeslots.startsAt)],
        with: { votes: true },
      },
    },
  });
  if (!outing) {
    return null;
  }
  return outing;
});

export async function getMyParticipant(args: {
  outingId: string;
  cookieTokenHash: string;
  userId: string | null;
}) {
  const byCookie = eq(participants.cookieTokenHash, args.cookieTokenHash);
  const clause = args.userId ? or(byCookie, eq(participants.userId, args.userId))! : byCookie;

  const row = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, args.outingId), clause),
  });
  return row ?? null;
}

export async function listMyOutingsForProfile(userId: string, limit = 10) {
  return db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        ne(outings.status, "cancelled"),
        gt(outings.deadlineAt, new Date())
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(limit);
}

/**
 * Sorties à afficher sur la home Sortie d'un user loggé : ses créations
 * + les sorties où il a une row participant (yes/no/handle_own/
 * interested). Sinon un user qui a uniquement RSVP (créé via le flow
 * silent-account au RSVP avec email) atterrissait sur une home vide.
 */
export async function listAllMyOutings(userId: string, now = new Date()) {
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      heroImageUrl: outings.heroImageUrl,
      // Champs requis par computePendingActions sur la home — discriminer
      // créateur vs participant et détecter "vote tranché à faire"
      // (mode=vote + chosenTimeslotId null + deadline passée).
      creatorUserId: outings.creatorUserId,
      creatorName: user.name,
      creatorUsername: user.username,
      creatorAnonName: outings.creatorAnonName,
      chosenTimeslotId: outings.chosenTimeslotId,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
    })
    .from(outings)
    .leftJoin(user, eq(user.id, outings.creatorUserId))
    .where(
      and(
        or(
          eq(outings.creatorUserId, userId),
          sql`${outings.id} IN (
            SELECT ${participants.outingId}
            FROM ${participants}
            WHERE ${participants.userId} = ${userId}
              AND ${participants.response} IN ('yes', 'no', 'handle_own', 'interested')
          )`
        ),
        ne(outings.status, "cancelled")
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(50);

  const upcoming = rows.filter((r) => !r.startsAt || r.startsAt >= now);
  const past = rows.filter((r) => r.startsAt && r.startsAt < now);
  return { upcoming, past };
}

export type AgendaItem = {
  outingId: string;
  shortId: string;
  slug: string;
  title: string;
  location: string | null;
  heroImageUrl: string | null;
  mode: "fixed" | "vote";
  status:
    | "open"
    | "awaiting_purchase"
    | "stale_purchase"
    | "purchased"
    | "past"
    | "settled"
    | "cancelled";
  isCreator: boolean;
  // `null` = aucune row participant côté user (créateur seul, ou voteur
  // qui n'a pas encore RSVP). Le mapping vers les filtres "yes/maybe/no/
  // pending" se fait côté UI pour rester libre de l'agréger comme on veut.
  myResponse: "yes" | "no" | "handle_own" | "interested" | null;
  fixedDate: Date | null;
  // Vide si `mode === 'fixed'`. Sinon, dates des timeslots candidats qui
  // tombent dans la fenêtre 3 mois (un sondage avec 5 candidats peut n'en
  // avoir que 2 dans la fenêtre — on n'affiche que ceux-là).
  candidateDates: Date[];
};

/**
 * Données pour `/sortie/agenda` (heatmap + timeline navigable) :
 *   1. sorties datées dont l'user est créateur ou participant (yes / no /
 *      handle_own / interested), avec `fixedDatetime` dans la fenêtre
 *      `[now - 365j, now + 365j]`.
 *   2. sondages dans le même périmètre user, avec au moins un timeslot
 *      candidat dans la fenêtre.
 *
 * Fenêtre symétrique : le user peut browse les mois passés via les
 * chevrons + swipe pour retrouver l'historique sans section dédiée.
 *
 * On exclut `cancelled` (les annulées disparaissent de l'agenda).
 * `closed` (sondage tranché → daté avec succès) n'apparaît que si
 * `fixedDatetime` est posé, donc traité comme datée via la branche 1.
 */
export async function listMyAgendaActivity(userId: string, now = new Date()) {
  const windowStart = new Date(now.getTime() - AGENDA_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + AGENDA_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // LEFT JOIN sur la row participant de l'user (s'il y en a une) pour
  // récupérer `response` en une passe. La WHERE assure qu'on a au moins
  // un lien (créateur ou participant) — pour un créateur sans participant,
  // `myResponse` reste null. Index `sortie_participants_user_idx` couvre
  // la jointure.
  const myParticipant = db.$with("my_participant").as(
    db
      .select({
        outingId: participants.outingId,
        response: participants.response,
      })
      .from(participants)
      .where(eq(participants.userId, userId))
  );

  const rows = await db
    .with(myParticipant)
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      heroImageUrl: outings.heroImageUrl,
      mode: outings.mode,
      status: outings.status,
      fixedDatetime: outings.fixedDatetime,
      creatorUserId: outings.creatorUserId,
      myResponse: myParticipant.response,
    })
    .from(outings)
    .leftJoin(myParticipant, eq(myParticipant.outingId, outings.id))
    .where(
      and(
        ne(outings.status, "cancelled"),
        or(eq(outings.creatorUserId, userId), isNotNull(myParticipant.response)),
        or(
          and(
            eq(outings.mode, "fixed"),
            isNotNull(outings.fixedDatetime),
            gte(outings.fixedDatetime, windowStart),
            lte(outings.fixedDatetime, windowEnd)
          ),
          and(
            eq(outings.mode, "vote"),
            exists(
              db
                .select({ id: outingTimeslots.id })
                .from(outingTimeslots)
                .where(
                  and(
                    eq(outingTimeslots.outingId, outings.id),
                    gte(outingTimeslots.startsAt, windowStart),
                    lte(outingTimeslots.startsAt, windowEnd)
                  )
                )
            )
          )
        )
      )
    )
    .limit(200);

  // 2e query bornée aux outings vote retournées : récupère leurs timeslots
  // qui tombent dans la fenêtre. On ne joint pas dans la 1re query pour
  // éviter de multiplier les rows par N candidats.
  const voteOutingIds = rows.filter((r) => r.mode === "vote").map((r) => r.id);
  const candidatesByOuting = new Map<string, Date[]>();
  if (voteOutingIds.length > 0) {
    const slots = await db
      .select({
        outingId: outingTimeslots.outingId,
        startsAt: outingTimeslots.startsAt,
      })
      .from(outingTimeslots)
      .where(
        and(
          inArray(outingTimeslots.outingId, voteOutingIds),
          gte(outingTimeslots.startsAt, windowStart),
          lte(outingTimeslots.startsAt, windowEnd)
        )
      )
      .orderBy(asc(outingTimeslots.startsAt));
    for (const s of slots) {
      const list = candidatesByOuting.get(s.outingId) ?? [];
      list.push(s.startsAt);
      candidatesByOuting.set(s.outingId, list);
    }
  }

  return rows.map<AgendaItem>((r) => ({
    outingId: r.id,
    shortId: r.shortId,
    slug: r.slug,
    title: r.title,
    location: r.location,
    heroImageUrl: r.heroImageUrl,
    mode: r.mode,
    status: r.status,
    isCreator: r.creatorUserId === userId,
    myResponse: r.myResponse,
    fixedDate: r.fixedDatetime,
    candidateDates: candidatesByOuting.get(r.id) ?? [],
  }));
}

/**
 * Public profile view — only surfaces outings the user chose to show
 * (`showOnProfile`) and excludes cancelled ones. Splits into upcoming vs
 * past by the current time against `fixedDatetime` (vote-mode outings
 * with no chosen slot yet count as upcoming).
 *
 * `confirmedCount` is computed via a scalar sub-query rather than a
 * LEFT JOIN + GROUP BY — cleaner to compose alongside ORDER BY / LIMIT,
 * and the participants outing_id index covers the lookup.
 */
export const listPublicProfileOutings = cache(async (userId: string, now = new Date()) => {
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      heroImageUrl: outings.heroImageUrl,
      createdAt: outings.createdAt,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
    })
    .from(outings)
    .where(
      and(
        eq(outings.creatorUserId, userId),
        eq(outings.showOnProfile, true),
        ne(outings.status, "cancelled")
      )
    )
    .orderBy(desc(outings.createdAt))
    .limit(50);

  const upcoming = rows.filter((r) => !r.startsAt || r.startsAt >= now);
  const past = rows.filter((r) => r.startsAt && r.startsAt < now);
  return { upcoming, past };
});

/**
 * "Inbox anon" — sorties auxquelles un visiteur anonyme a participé,
 * identifié par son cookie token. Une `participants` row matchée sur
 * `cookieTokenHash` suffit : le visiteur a forcément répondu (yes/no/
 * handle_own) ou voté ("interested") pour qu'une row existe. Utilisé
 * sur la home pour ramener un anon à ses sorties au lieu de lui
 * resservir le landing public générique.
 *
 * On retourne aussi `anonName` (premier non-null trouvé) pour pouvoir
 * personnaliser le header sans demander à l'utilisateur de se logger.
 */
export async function listAnonInboxOutings(cookieTokenHash: string, now = new Date()) {
  // Le INNER JOIN ramène en un seul aller-retour les outings filtrées
  // ET les rows participant complètes. On évite un 2e SELECT sur
  // `participants` côté call-site (qui aurait juste re-matché les
  // mêmes rows par cookieTokenHash). Les votedSlots restent en query
  // séparée — un LEFT JOIN supplémentaire sur timeslot_votes
  // multiplierait les rows et compliquerait la dédup côté JS.
  const rows = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      startsAt: outings.fixedDatetime,
      deadlineAt: outings.deadlineAt,
      status: outings.status,
      mode: outings.mode,
      heroImageUrl: outings.heroImageUrl,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
      participant: getTableColumns(participants),
    })
    .from(outings)
    .innerJoin(participants, eq(participants.outingId, outings.id))
    .where(and(eq(participants.cookieTokenHash, cookieTokenHash), ne(outings.status, "cancelled")))
    .orderBy(desc(outings.createdAt))
    .limit(50);

  const participantIds = rows.map((r) => r.participant.id);
  const slotsByParticipant = new Map<string, Date[]>();
  if (participantIds.length > 0) {
    const slotRows = await db
      .select({
        participantId: timeslotVotes.participantId,
        startsAt: outingTimeslots.startsAt,
      })
      .from(timeslotVotes)
      .innerJoin(outingTimeslots, eq(outingTimeslots.id, timeslotVotes.timeslotId))
      .where(
        and(inArray(timeslotVotes.participantId, participantIds), eq(timeslotVotes.available, true))
      )
      .orderBy(asc(outingTimeslots.startsAt));
    for (const slot of slotRows) {
      const list = slotsByParticipant.get(slot.participantId) ?? [];
      list.push(slot.startsAt);
      slotsByParticipant.set(slot.participantId, list);
    }
  }

  const myRsvpByOuting = new Map<string, MyParticipantWithSlots>();
  for (const row of rows) {
    if (!myRsvpByOuting.has(row.id)) {
      myRsvpByOuting.set(row.id, {
        ...row.participant,
        votedSlots: slotsByParticipant.get(row.participant.id) ?? [],
      });
    }
  }

  const upcoming = rows.filter((r) => !r.startsAt || r.startsAt >= now);
  const past = rows.filter((r) => r.startsAt && r.startsAt < now);
  const anonName = rows.find((r) => r.participant.anonName)?.participant.anonName ?? null;
  return { upcoming, past, anonName, myRsvpByOuting };
}

/**
 * Batches participant lookups for a set of outings, identifying the viewer
 * either by their device cookie hash (anon) or their account id (logged-in).
 * Returns a `Map<outingId, participant>` — at most one participant per outing
 * per viewer, enforced by the `sortie_participants_outing_cookie_unique`
 * constraint.
 *
 * Skips the DB round-trip entirely when the viewer has no identity signal.
 */
export type MyParticipantWithSlots = typeof participants.$inferSelect & {
  // Créneaux marqués `available = true` par le viewer en mode vote.
  // Toujours présent (tableau vide pour les sorties fixed ou les modes
  // vote sans choix coché). Trié par `startsAt` ASC pour permettre
  // l'affichage compact "Mar 12 · Mer 13" sans re-sort côté UI.
  votedSlots: Date[];
};

export async function listMyParticipantsForOutings(args: {
  outingIds: string[];
  cookieTokenHash: string | null;
  userId: string | null;
}) {
  if (args.outingIds.length === 0) {
    return new Map<string, MyParticipantWithSlots>();
  }
  if (!args.cookieTokenHash && !args.userId) {
    return new Map<string, MyParticipantWithSlots>();
  }
  const identityClauses = [];
  if (args.cookieTokenHash) {
    identityClauses.push(eq(participants.cookieTokenHash, args.cookieTokenHash));
  }
  if (args.userId) {
    identityClauses.push(eq(participants.userId, args.userId));
  }
  const identity = identityClauses.length === 1 ? identityClauses[0]! : or(...identityClauses)!;

  const rows = await db.query.participants.findMany({
    where: and(inArray(participants.outingId, args.outingIds), identity),
  });

  // Un seul aller-retour pour ramener les créneaux votés (available=true)
  // de tous les participants viewer. Vide si aucune sortie en mode vote
  // n'est dans le lot. Le `inArray` sur `participantId` est borné par le
  // nombre de sorties affichées (typiquement < 20), donc pas de risque
  // de blow-up sur cette query.
  const participantIds = rows.map((r) => r.id);
  const slotsByParticipant = new Map<string, Date[]>();
  if (participantIds.length > 0) {
    const slotRows = await db
      .select({
        participantId: timeslotVotes.participantId,
        startsAt: outingTimeslots.startsAt,
      })
      .from(timeslotVotes)
      .innerJoin(outingTimeslots, eq(outingTimeslots.id, timeslotVotes.timeslotId))
      .where(
        and(inArray(timeslotVotes.participantId, participantIds), eq(timeslotVotes.available, true))
      )
      .orderBy(asc(outingTimeslots.startsAt));

    for (const slot of slotRows) {
      const list = slotsByParticipant.get(slot.participantId) ?? [];
      list.push(slot.startsAt);
      slotsByParticipant.set(slot.participantId, list);
    }
  }

  const byOuting = new Map<string, MyParticipantWithSlots>();
  for (const row of rows) {
    // A viewer can only have one participant row per outing — first hit wins
    // and the unique index prevents duplicates anyway.
    if (!byOuting.has(row.outingId)) {
      byOuting.set(row.outingId, {
        ...row,
        votedSlots: slotsByParticipant.get(row.id) ?? [],
      });
    }
  }
  return byOuting;
}

/**
 * Sorties à inclure dans le flux iCal personnel d'un user :
 *   - sorties qu'il a créées (creator_user_id match)
 *   - OU sorties où il a une row participant avec response IN (yes,
 *     handle_own, interested)
 *
 * Sémantique iCal côté builder :
 *   - response = yes / handle_own → STATUS:CONFIRMED + TRANSP:OPAQUE
 *     (bloque la dispo, l'user est engagé)
 *   - response = interested → STATUS:CONFIRMED + TRANSP:TRANSPARENT +
 *     suffixe " · à confirmer" sur le SUMMARY (visible dans l'agenda
 *     mais ne bloque pas la dispo, l'user n'est pas encore figé)
 *
 * Cas mode vote :
 *   - vote-mode picked (chosenTimeslotId set, fixedDatetime set) → 1
 *     VEVENT canonique à fixedDatetime, sémantique selon userResponse
 *   - vote-mode unpicked + user a voté `available = true` sur N
 *     créneaux → N VEVENTs candidates (1 par créneau voté), chacun
 *     marqué tentative. UID dérivé `${shortId}-${timeslotId}@...` pour
 *     que les candidates cohabitent. Une fois pickTimeslot déclenché,
 *     les candidate UIDs sortent du feed (calendar les retire) et le
 *     UID canonique entre.
 *   - vote-mode unpicked sans vote available → pas dans le feed (rien
 *     à poser dans l'agenda)
 *
 * Filtres temporels :
 *   - on garde 30 jours d'historique (cf. FEED_HISTORY_WINDOW_DAYS)
 *
 * Sorties annulées : INCLUSES, avec STATUS:CANCELLED. Le calendrier
 * les barre — l'user voit l'annulation sans rouvrir Sortie.
 *
 * Retourne le format `FeedOuting` consommé directement par
 * `buildIcsFeed`. Une row par VEVENT à émettre.
 */
export async function feedOutingsForUser(userId: string): Promise<FeedOuting[]> {
  const cutoff = new Date(Date.now() - FEED_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      fixedDatetime: outings.fixedDatetime,
      status: outings.status,
      vibe: outings.vibe,
      ticketUrl: outings.eventLink,
      creatorName: user.name,
      // Champs RFC 5545 nécessaires pour que les clients calendar
      // (Apple, Outlook notamment) re-rendent leur copie locale au
      // refresh : SEQUENCE, LAST-MODIFIED, CREATED. Cf. §3.8.7.4.
      sequence: outings.sequence,
      createdAt: outings.createdAt,
      updatedAt: outings.updatedAt,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
      // Liste des prénoms des participants confirmés, créateur exclu
      // (déjà mentionné via "Organisé par X" dans la DESCRIPTION) et
      // user-courant exclu (il sait qu'il vient). Triés par
      // `respondedAt` ASC pour garder les early birds en tête. Le LIMIT
      // est posé sur le LATERAL pour ne pas peser inutilement quand une
      // sortie a 30 RSVPs — l'affichage iCal cap à ~6 noms de toute
      // façon.
      confirmedNames: sql<string[]>`(
        SELECT COALESCE(array_agg(name ORDER BY responded_at ASC), '{}'::text[])
        FROM (
          SELECT
            COALESCE(${user.name}, ${participants.anonName}) AS name,
            ${participants.respondedAt} AS responded_at
          FROM ${participants}
          LEFT JOIN ${user} ON ${user.id} = ${participants.userId}
          WHERE ${participants.outingId} = ${outings.id}
            AND ${participants.response} IN ('yes', 'handle_own')
            AND ${participants.userId} IS DISTINCT FROM ${userId}
            AND ${participants.userId} IS DISTINCT FROM ${outings.creatorUserId}
          ORDER BY ${participants.respondedAt} ASC
          LIMIT 12
        ) confirmed_names_subquery
      )`.as("confirmed_names"),
      // Response du user-courant sur cette sortie. Sert au builder à
      // décider TRANSP:OPAQUE (= il vient, ça bloque sa dispo) vs
      // TRANSP:TRANSPARENT (= pas encore figé pour lui), et le suffixe
      // " · à confirmer" sur le SUMMARY. NULL pour les sorties qu'il a
      // créées mais auxquelles il n'a pas RSVP — traité comme "yes"
      // côté builder (le créateur vient par défaut).
      userResponse: sql<"yes" | "no" | "handle_own" | "interested" | null>`(
        SELECT ${participants.response}::text FROM ${participants}
        WHERE ${participants.outingId} = ${outings.id}
          AND ${participants.userId} = ${userId}
        LIMIT 1
      )`.as("user_response"),
    })
    .from(outings)
    .leftJoin(user, eq(user.id, outings.creatorUserId))
    .where(
      and(
        isNotNull(outings.fixedDatetime),
        gte(outings.fixedDatetime, cutoff),
        or(
          eq(outings.creatorUserId, userId),
          inArray(
            outings.id,
            db
              .select({ id: participants.outingId })
              .from(participants)
              .where(
                and(
                  eq(participants.userId, userId),
                  inArray(participants.response, ["yes", "handle_own", "interested"])
                )
              )
          )
        )
      )
    )
    .orderBy(asc(outings.fixedDatetime));

  // Query B : candidates en mode vote pas encore figé. Pour chaque
  // sortie où l'user a voté `available = true` sur N timeslots, on
  // émet N rows distinctes (une par timeslot voté) avec un UID dérivé.
  // Une fois pickTimeslot déclenché, fixedDatetime est set → la sortie
  // tombe dans Query A et les candidate UIDs disparaissent du feed.
  const candidateRows = await db
    .select({
      shortId: outings.shortId,
      slug: outings.slug,
      title: outings.title,
      location: outings.location,
      status: outings.status,
      vibe: outings.vibe,
      ticketUrl: outings.eventLink,
      creatorName: user.name,
      sequence: outings.sequence,
      createdAt: outings.createdAt,
      updatedAt: outings.updatedAt,
      confirmedCount: confirmedCountSql.as("confirmed_count"),
      timeslotId: outingTimeslots.id,
      timeslotStartsAt: outingTimeslots.startsAt,
    })
    .from(outings)
    .leftJoin(user, eq(user.id, outings.creatorUserId))
    .innerJoin(outingTimeslots, eq(outingTimeslots.outingId, outings.id))
    .innerJoin(timeslotVotes, eq(timeslotVotes.timeslotId, outingTimeslots.id))
    .innerJoin(
      participants,
      and(eq(participants.id, timeslotVotes.participantId), eq(participants.userId, userId))
    )
    .where(
      and(
        eq(outings.mode, "vote"),
        isNull(outings.chosenTimeslotId),
        ne(outings.status, "cancelled"),
        eq(timeslotVotes.available, true),
        gte(outingTimeslots.startsAt, cutoff)
      )
    )
    .orderBy(asc(outingTimeslots.startsAt));

  // `userResponse === null` côté builder veut dire "le user n'a pas de
  // row participant" — vu que la WHERE clause restreint aux sorties
  // (créées par le user) OU (où le user a RSVP yes/handle_own/interested),
  // un userResponse null implique forcément que le user est le créateur.
  // Le builder traitera ce cas comme "yes" implicite (le créateur vient
  // par défaut sur ses propres sorties).
  const canonical: FeedOuting[] = rows
    .filter((r): r is typeof r & { fixedDatetime: Date } => r.fixedDatetime !== null)
    .map((r) => ({
      shortId: r.shortId,
      slug: r.slug,
      title: r.title,
      location: r.location,
      fixedDatetime: r.fixedDatetime,
      status: r.status,
      vibe: r.vibe,
      ticketUrl: r.ticketUrl,
      creatorName: r.creatorName,
      sequence: r.sequence,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      confirmedCount: r.confirmedCount,
      confirmedNames: r.confirmedNames ?? [],
      userResponse: r.userResponse,
      candidateTimeslotId: null,
    }));

  // Pour les candidates, userResponse forcé à "interested" → le builder
  // déclenche TRANSP:TRANSPARENT + suffixe " · à confirmer". On laisse
  // confirmedNames vide ici : la liste de confirmés n'a pas de sens
  // tant que le créneau n'est pas figé (on ne connaît pas qui sera
  // dispo sur ce slot précisément). Le count reste informatif.
  const candidates: FeedOuting[] = candidateRows.map((r) => ({
    shortId: r.shortId,
    slug: r.slug,
    title: r.title,
    location: r.location,
    fixedDatetime: r.timeslotStartsAt,
    status: r.status,
    vibe: r.vibe,
    ticketUrl: r.ticketUrl,
    creatorName: r.creatorName,
    sequence: r.sequence,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    confirmedCount: r.confirmedCount,
    confirmedNames: [],
    userResponse: "interested",
    candidateTimeslotId: r.timeslotId,
  }));

  return [...canonical, ...candidates];
}
