import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendSortieEmail } from "@/lib/resend-sortie";
import { participants } from "@drizzle/sortie-schema";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import {
  j1ReminderEmail,
  outingCancelledEmail,
  outingModifiedEmail,
  rsvpClosedEmail,
  rsvpReceivedEmail,
  timeslotPickedEmail,
} from "./templates";

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
  const isResponderCreator =
    (args.responder.userId && args.responder.userId === args.outing.creatorUserId) ||
    (args.outing.creatorCookieTokenHash !== null &&
      args.outing.creatorCookieTokenHash === args.responder.cookieTokenHash);
  if (isResponderCreator) {
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
  const { subject, html } = outingModifiedEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    changes: args.diff,
  });

  await Promise.all(
    recipients
      .map((p) => p.anonEmail ?? p.user?.email ?? null)
      .filter((e): e is string => !!e)
      .map((email) => safeSend({ to: email, subject, html, trigger: "outing-modified" }))
  );
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

  const { subject, html } = outingCancelledEmail({
    outingTitle: args.outing.title,
    homeUrl: BASE_URL,
  });

  await Promise.all(
    recipients
      .map((p) => p.anonEmail ?? p.user?.email ?? null)
      .filter((e): e is string => !!e)
      .map((email) => safeSend({ to: email, subject, html, trigger: "outing-cancelled" }))
  );
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
  const { subject, html } = rsvpClosedEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    fixedDatetime: args.outing.fixedDatetime,
    location: args.outing.location,
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
  const { subject, html } = timeslotPickedEmail({
    outingTitle: args.outing.title,
    outingUrl: `${BASE_URL}${canonical}`,
    fixedDatetime: args.outing.fixedDatetime,
    location: args.outing.location,
  });

  await Promise.all(
    recipients
      .map((p) => p.anonEmail ?? p.user?.email ?? null)
      .filter((e): e is string => !!e)
      .map((email) => safeSend({ to: email, subject, html, trigger: "timeslot-picked" }))
  );
}
