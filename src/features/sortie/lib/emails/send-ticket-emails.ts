import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendSortieEmail } from "@/lib/resend-sortie";
import { participants } from "@drizzle/sortie-schema";
import { ticketAvailableEmail } from "./templates";

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

function outingPath(slug: string | null, shortId: string): string {
  return slug ? `/${slug}-${shortId}` : `/${shortId}`;
}

async function safeSend(args: {
  to: string;
  subject: string;
  html: string;
  trigger: string;
}): Promise<void> {
  try {
    await sendSortieEmail({ to: args.to, subject: args.subject, html: args.html });
  } catch (err) {
    console.error(`[sortie/email] ${args.trigger} send failed`, err);
  }
}

type OutingForEmail = {
  title: string;
  fixedDatetime: Date | null;
  slug: string | null;
  shortId: string;
};

/**
 * Notifie le détenteur d'un billet nominatif. Utilise l'email du compte si
 * lié, sinon l'`anonEmail` saisi au RSVP. Si aucun email n'est dispo (cas
 * théoriquement bloqué côté action mais defense-in-depth), on log et on
 * skip silencieusement plutôt que de planter le flow upload.
 */
export async function sendParticipantTicketEmail(args: {
  outing: OutingForEmail;
  participantId: string;
}): Promise<void> {
  const row = await db.query.participants.findFirst({
    where: eq(participants.id, args.participantId),
    with: { user: { columns: { email: true, name: true } } },
  });
  if (!row) {
    return;
  }
  const email = row.user?.email ?? row.anonEmail ?? null;
  if (!email) {
    console.warn("[sortie/email] participant ticket email skipped — no recipient", {
      participantId: args.participantId,
    });
    return;
  }
  const name = row.anonName ?? row.user?.name ?? "toi";
  const ticketsUrl = `${BASE_URL}${outingPath(args.outing.slug, args.outing.shortId)}/billets`;

  const { subject, html } = ticketAvailableEmail({
    outingTitle: args.outing.title,
    outingDate: args.outing.fixedDatetime,
    ticketsUrl,
    scope: "participant",
    recipientName: name,
  });
  await safeSend({ to: email, subject, html, trigger: "ticket-uploaded-participant" });
}

/**
 * Notifie tous les participants actifs d'une sortie qu'un billet groupé
 * est disponible. Filtre :
 *   - response IN ('yes', 'handle_own') — cohérent avec ticket-auth qui
 *     refuse l'accès aux autres réponses
 *   - email présent (user.email OU anonEmail)
 *
 * Envois en parallèle avec safeSend — un échec individuel ne bloque pas
 * les autres. Si tous les participants n'ont pas d'email, on a un broadcast
 * vide silencieux : c'est OK, ils peuvent toujours voir le billet en se
 * connectant manuellement.
 */
export async function sendOutingTicketEmails(args: {
  outing: OutingForEmail;
  outingId: string;
}): Promise<void> {
  const rows = await db.query.participants.findMany({
    where: and(
      eq(participants.outingId, args.outingId),
      inArray(participants.response, ["yes", "handle_own"]),
      or(isNotNull(participants.userId), isNotNull(participants.anonEmail))
    ),
    with: { user: { columns: { email: true, name: true } } },
  });

  const ticketsUrl = `${BASE_URL}${outingPath(args.outing.slug, args.outing.shortId)}/billets`;

  await Promise.all(
    rows.map((p) => {
      const email = p.user?.email ?? p.anonEmail ?? null;
      if (!email) {
        return Promise.resolve();
      }
      const name = p.anonName ?? p.user?.name ?? "toi";
      const { subject, html } = ticketAvailableEmail({
        outingTitle: args.outing.title,
        outingDate: args.outing.fixedDatetime,
        ticketsUrl,
        scope: "outing",
        recipientName: name,
      });
      return safeSend({ to: email, subject, html, trigger: "ticket-uploaded-outing" });
    })
  );
}
