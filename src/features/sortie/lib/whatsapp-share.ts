import { formatRelativeDateForShare } from "@/features/sortie/lib/date-fr";

type WhatsAppShareArgs = {
  title: string;
  url: string;
  startsAt: Date | null;
  /**
   * Creator's first name. When present we open with "{Léa} t'invite :"
   * — a trust-anchor pattern (Cal.com +40% booking rate) that makes the
   * link feel personal rather than bulk. Falls back to a plain title
   * lead when the creator is fully anonymous with no name on file.
   */
  firstName?: string | null;
  now?: Date;
};

/**
 * WhatsApp copy — what the sender's thumb sees in the chat above the
 * preview card. Two variants:
 *   with name:    "Léa t'invite : Raclette, ce samedi. Tu viens ? <url>"
 *   without name: "Raclette, ce samedi. Tu viens ? <url>"
 *
 * The 🎭 emoji we used to prepend has been dropped — it tested as
 * "theatre-coded" and this copy reads cleaner without it.
 */
export function buildWhatsAppMessage(args: WhatsAppShareArgs): string {
  const { title, url, startsAt, firstName, now } = args;
  const safeTitle = title.trim() || "Sortie";
  const dateBit = startsAt ? `, ${formatRelativeDateForShare(startsAt, now)}` : "";
  const lead = firstName
    ? `${firstName} t'invite : ${safeTitle}${dateBit}.`
    : `${safeTitle}${dateBit}.`;
  return `${lead} Tu viens ? ${url}`;
}

export function buildWhatsAppHref(args: WhatsAppShareArgs): string {
  return `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(args))}`;
}
