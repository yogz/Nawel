import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { type SortieEmailAttachment } from "@/lib/resend-sortie";
import { outings, participants } from "@drizzle/sortie-schema";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { isOutingOwner } from "@/features/sortie/lib/owner";
import {
  buildOutingEventIcs,
  type IcsMethod,
  type OutingIcsContext,
} from "@/features/sortie/lib/build-event-ics";
import { BASE_URL, outingPath, safeSend } from "./shared";
import {
  j1ReminderEmail,
  outingCancelledEmail,
  outingModifiedEmail,
  rsvpClosedEmail,
  rsvpReceivedEmail,
  timeslotPickedEmail,
} from "./templates";

/**
 * Charge l'outing et retourne l'attachment ICS prêt à passer à Resend.
 * Retourne `undefined` quand l'outing n'a pas (encore) de date — cas mode
 * vote non figé : pas d'event à proposer au calendrier, on skip l'attachment
 * mais on garde le mail texte.
 */
async function buildAttachmentsForOuting(
  outingId: string,
  method: IcsMethod
): Promise<SortieEmailAttachment[] | undefined> {
  const row = await db.query.outings.findFirst({
    where: eq(outings.id, outingId),
    columns: {
      shortId: true,
      slug: true,
      title: true,
      location: true,
      fixedDatetime: true,
      sequence: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row || !row.fixedDatetime) {
    return undefined;
  }
  const ctx: OutingIcsContext = { ...row, fixedDatetime: row.fixedDatetime };
  return [buildOutingEventIcs({ outing: ctx, method, publicBase: BASE_URL })];
}

type RecipientWithPitch = {
  anonEmail: string | null;
  userId: string | null;
  user: { email: string | null } | null;
};

/**
 * Fan-out commun aux 3 mails qui embarquent un ICS : extrait l'email
 * (anonEmail prioritaire sur user.email), évalue `showCalendarFeedPitch`
 * (anonyme = pas de userId), et délègue le rendu HTML au caller pour qu'il
 * compose son template avec le flag. La même pièce jointe est partagée
 * — elle ne dépend pas du destinataire.
 */
async function dispatchEmailWithPitch<R extends RecipientWithPitch>(args: {
  recipients: R[];
  trigger: string;
  attachments: SortieEmailAttachment[] | undefined;
  buildEmail: (showCalendarFeedPitch: boolean) => { subject: string; html: string };
}): Promise<void> {
  await Promise.all(
    args.recipients.map(async (p) => {
      const email = p.anonEmail ?? p.user?.email ?? null;
      if (!email) return;
      const { subject, html } = args.buildEmail(p.userId === null);
      await safeSend({
        to: email,
        subject,
        html,
        trigger: args.trigger,
        attachments: args.attachments,
      });
    })
  );
}

/**
 * Fires when anyone RSVPs to a sortie. The creator receives a summary so
 * they learn about headcount changes without reloading the page.
 *
 * Skips if the responder is the creator themselves (self-RSVPs don't need a
 * notification) or if the creator has no contact email on file.
 */
export async function sendRsvpReceivedEmail(args: {
  outing: {
    title: string;
    slug: string | null;
    shortId: string;
    creatorUserId: string | null;
    creatorAnonEmail: string | null;
    creatorCookieTokenHash: string | null;
  };
  responder: {
    participantId: string;
    cookieTokenHash: string;
    userId: string | null;
    anonName: string | null;
    userName: string | null;
  };
  response: "yes" | "no" | "handle_own";
  extraAdults: number;
  extraChildren: number;
}): Promise<void> {
  if (
    isOutingOwner(args.outing, {
      userId: args.responder.userId,
      cookieTokenHash: args.responder.cookieTokenHash,
    })
  ) {
    return;
  }

  let creatorEmail: string | null = null;
  if (args.outing.creatorUserId) {
    const creator = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, args.outing.creatorUserId!),
      columns: { email: true },
    });
    creatorEmail = creator?.email ?? null;
  } else {
    creatorEmail = args.outing.creatorAnonEmail;
  }
  if (!creatorEmail) {
    return;
  }

  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const responderName = args.responder.anonName ?? args.responder.userName ?? "Quelqu'un";

  const { subject, html } = rsvpReceivedEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    responderName,
    response: args.response,
    extraAdults: args.extraAdults,
    extraChildren: args.extraChildren,
  });
  await safeSend({ to: creatorEmail, subject, html, trigger: "rsvp-received" });
}

type OutingSnapshot = {
  title: string;
  location: string | null;
  fixedDatetime: Date | null;
  deadlineAt: Date;
  eventLink: string | null;
  heroImageUrl: string | null;
};

/**
 * Builds the human-readable diff of material fields between two outing
 * snapshots. Only returns entries whose value actually changed.
 */
export function buildOutingDiff(
  before: OutingSnapshot,
  after: OutingSnapshot
): Array<{ label: string; before: string | null; after: string | null }> {
  const diff: Array<{ label: string; before: string | null; after: string | null }> = [];

  if (before.title !== after.title) {
    diff.push({ label: "Titre", before: before.title, after: after.title });
  }
  if (before.location !== after.location) {
    diff.push({ label: "Lieu", before: before.location, after: after.location });
  }
  const beforeStart = before.fixedDatetime?.getTime() ?? null;
  const afterStart = after.fixedDatetime?.getTime() ?? null;
  if (beforeStart !== afterStart) {
    diff.push({
      label: "Date",
      before: before.fixedDatetime ? formatOutingDateConversational(before.fixedDatetime) : null,
      after: after.fixedDatetime ? formatOutingDateConversational(after.fixedDatetime) : null,
    });
  }
  if (before.deadlineAt.getTime() !== after.deadlineAt.getTime()) {
    diff.push({
      label: "Deadline de réponse",
      before: formatOutingDateConversational(before.deadlineAt),
      after: formatOutingDateConversational(after.deadlineAt),
    });
  }
  if (before.eventLink !== after.eventLink) {
    diff.push({ label: "Lien billetterie", before: before.eventLink, after: after.eventLink });
  }
  if (before.heroImageUrl !== after.heroImageUrl) {
    // Les URLs d'image ne sont pas lisibles en email — on remonte juste
    // le signal de changement avec des libellés génériques. Le CTA
    // "Revoir la sortie" laisse l'invité voir la nouvelle image en
    // contexte sur la page publique.
    diff.push({
      label: "Image",
      before: before.heroImageUrl ? "Image précédente" : null,
      after: after.heroImageUrl ? "Nouvelle image" : null,
    });
  }

  return diff;
}

/**
 * Sent to every non-"no" participant (yes + handle_own) with an email on
 * file. Skipped when nothing material changed so the editor can tweak a
 * typo without flooding the group.
 */
export async function sendOutingModifiedEmails(args: {
  outing: { id: string; title: string; slug: string | null; shortId: string };
  diff: Array<{ label: string; before: string | null; after: string | null }>;
}): Promise<void> {
  if (args.diff.length === 0) {
    return;
  }

  const recipients = await db.query.participants.findMany({
    where: and(eq(participants.outingId, args.outing.id), ne(participants.response, "no")),
    with: { user: { columns: { email: true } } },
  });

  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const attachments = await buildAttachmentsForOuting(args.outing.id, "PUBLISH");

  await dispatchEmailWithPitch({
    recipients,
    trigger: "outing-modified",
    attachments,
    buildEmail: (showCalendarFeedPitch) =>
      outingModifiedEmail({
        outingTitle: args.outing.title,
        outingUrl: `${BASE_URL}${canonical}`,
        changes: args.diff,
        showCalendarFeedPitch,
      }),
  });
}

/**
 * Sent to every non-"no" participant (yes + handle_own) when the creator
 * cancels the outing.
 */
export async function sendOutingCancelledEmails(args: {
  outing: { id: string; title: string };
}): Promise<void> {
  const recipients = await db.query.participants.findMany({
    where: and(eq(participants.outingId, args.outing.id), ne(participants.response, "no")),
    with: { user: { columns: { email: true } } },
  });

  const attachments = await buildAttachmentsForOuting(args.outing.id, "CANCEL");

  await dispatchEmailWithPitch({
    recipients,
    trigger: "outing-cancelled",
    attachments,
    buildEmail: (showCalendarFeedPitch) =>
      outingCancelledEmail({
        outingTitle: args.outing.title,
        homeUrl: BASE_URL,
        showCalendarFeedPitch,
      }),
  });
}

/**
 * Fired by the sweeper the first time it observes `deadlineAt < NOW()` for
 * an `open` outing. Reaches only confirmed attendees (yes + handle_own) so
 * the people who said no don't get a useless "la liste est arrêtée" ping.
 */
export async function sendRsvpClosedEmails(args: {
  outing: {
    id: string;
    title: string;
    slug: string | null;
    shortId: string;
    fixedDatetime: Date | null;
    location: string | null;
    mode: "fixed" | "vote";
    chosenTimeslotId: string | null;
  };
}): Promise<void> {
  const recipients = await db.query.participants.findMany({
    where: and(
      eq(participants.outingId, args.outing.id),
      ne(participants.response, "no"),
      ne(participants.response, "interested")
    ),
    with: { user: { columns: { email: true } } },
  });

  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  // Sondage non tranché à la cloture → le template doit dire « l'orga
  // pickera le créneau » au lieu de « rdv à la date prévue » (faux et
  // mauvais signal pour le user qui ne sait toujours pas quand).
  const awaitingPick = args.outing.mode === "vote" && args.outing.chosenTimeslotId === null;
  const { subject, html } = rsvpClosedEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    fixedDatetime: args.outing.fixedDatetime,
    location: args.outing.location,
    awaitingPick,
  });

  await Promise.all(
    recipients
      .map((p) => p.anonEmail ?? p.user?.email ?? null)
      .filter((e): e is string => !!e)
      .map((email) => safeSend({ to: email, subject, html, trigger: "rsvp-closed" }))
  );
}

/**
 * Fired once per outing by the sweeper when fixedDatetime is ~24h away.
 * Reaches confirmed attendees (yes + handle_own). The caller is responsible
 * for stamping `reminder_j1_sent_at` before this runs so a partial failure
 * doesn't re-fire the whole batch on the next cron tick.
 */
export async function sendJ1ReminderEmails(args: {
  outing: {
    id: string;
    title: string;
    slug: string | null;
    shortId: string;
    fixedDatetime: Date;
    location: string | null;
  };
}): Promise<void> {
  const recipients = await db.query.participants.findMany({
    where: and(
      eq(participants.outingId, args.outing.id),
      ne(participants.response, "no"),
      ne(participants.response, "interested")
    ),
    with: { user: { columns: { email: true } } },
  });

  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const { subject, html } = j1ReminderEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    fixedDatetime: args.outing.fixedDatetime,
    location: args.outing.location,
  });

  await Promise.all(
    recipients
      .map((p) => p.anonEmail ?? p.user?.email ?? null)
      .filter((e): e is string => !!e)
      .map((email) => safeSend({ to: email, subject, html, trigger: "j1-reminder" }))
  );
}

/**
 * Fired when the creator picks a winning timeslot on a vote-mode outing.
 * Reaches every participant who didn't say outright "no" — including those
 * still in "interested" status, since they need the prompt to reconfirm.
 */
export async function sendTimeslotPickedEmails(args: {
  outing: {
    id: string;
    title: string;
    slug: string | null;
    shortId: string;
    location: string | null;
    fixedDatetime: Date;
  };
}): Promise<void> {
  const recipients = await db.query.participants.findMany({
    where: and(eq(participants.outingId, args.outing.id), ne(participants.response, "no")),
    with: { user: { columns: { email: true } } },
  });

  const canonical = outingPath(args.outing.slug, args.outing.shortId);
  const attachments = await buildAttachmentsForOuting(args.outing.id, "PUBLISH");

  await dispatchEmailWithPitch({
    recipients,
    trigger: "timeslot-picked",
    attachments,
    buildEmail: (showCalendarFeedPitch) =>
      timeslotPickedEmail({
        outingTitle: args.outing.title,
        outingUrl: `${BASE_URL}${canonical}`,
        fixedDatetime: args.outing.fixedDatetime,
        location: args.outing.location,
        showCalendarFeedPitch,
      }),
  });
}
