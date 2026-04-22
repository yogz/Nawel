import { Resend } from "resend";

/**
 * Resend client scoped to Sortie's sender identity. Reuses the verified
 * colist.fr domain (SPF/DKIM/DMARC already configured for hello@colist.fr)
 * with a dedicated From address so users read "Sortie" in their inbox, not
 * "CoList". The spec is explicit that Sortie positions as a standalone
 * product, free of any CoList branding in user-facing copy.
 *
 * Templates stay as inline HTML strings until Phase 5, where volume justifies
 * introducing @react-email/components.
 */

const FROM = "Sortie <sortie@colist.fr>";
const REPLY_TO = "sortie@colist.fr";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("[sortie/resend] RESEND_API_KEY is not set");
    client = new Resend(key);
  }
  return client;
}

export async function sendSortieEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  // Guard against header injection via subject (CRLF split to force a Bcc:, etc.)
  const safeSubject = args.subject.replace(/[\r\n]+/g, " ").slice(0, 200);

  const { error } = await getClient().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: args.to,
    subject: safeSubject,
    html: args.html,
  });

  if (error) {
    // Never include the html body or full destination in logs — email content
    // can contain tokens and personal data. Log the Resend error shape only.
    console.error("[sortie/resend] delivery failed:", error);
    throw new Error(`[sortie/resend] failed to deliver: ${error.name ?? "unknown"}`);
  }
}
