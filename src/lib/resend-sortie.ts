import { Resend } from "resend";

/**
 * Resend helper scoped to Sortie's sender identity. Reuses the verified
 * colist.fr domain with a dedicated From so users see "Sortie" in their inbox,
 * never "CoList".
 */

const FROM = "Sortie <sortie@colist.fr>";
const REPLY_TO = "sortie@colist.fr";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("[sortie/resend] RESEND_API_KEY is not set");
    }
    client = new Resend(key);
  }
  return client;
}

/**
 * WARNING: `html` is sent verbatim. Callers MUST HTML-escape any
 * user-controlled substring before interpolation (display names, outing
 * titles, URLs from user input). Sortie emails carry a verified-domain
 * signature, so an unescaped injection becomes an effective phishing vector.
 * A centralised render helper will land alongside the first real email
 * template in Phase 2.
 */
export async function sendSortieEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const safeSubject = args.subject.replace(/[\r\n]+/g, " ").slice(0, 200);

  const { error } = await getClient().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: args.to,
    subject: safeSubject,
    html: args.html,
  });

  if (error) {
    // PII guard: never log the html body or full recipient — email content
    // can contain magic-link tokens and personal data.
    console.error("[sortie/resend] delivery failed:", error);
    throw new Error(`[sortie/resend] failed to deliver: ${error.name ?? "unknown"}`);
  }
}
