import { sendSortieEmail } from "@/lib/resend-sortie";

export const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(
  /\/$/,
  ""
);

export function outingPath(slug: string | null, shortId: string): string {
  return slug ? `/${slug}-${shortId}` : `/${shortId}`;
}

/**
 * Wraps `sendSortieEmail` with a try/catch that logs but never throws. Email
 * failures must not roll back the action that triggered them — money state
 * transitions and ticket uploads are persisted before the email fires, so a
 * Resend hiccup leaves the DB consistent and the user can re-send manually.
 */
export async function safeSend(args: {
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
