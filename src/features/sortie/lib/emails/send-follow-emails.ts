import { sendSortieEmail } from "@/lib/resend-sortie";
import { newFollowerEmail } from "./templates";

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

/**
 * Wrapper qui swallow les erreurs d'envoi pour ne pas faire échouer
 * l'action `followUser` côté UX si Resend hoquette — la relation
 * follow reste valide même si la notif passe à la trappe.
 */
export async function sendNewFollowerEmail(args: {
  to: string;
  followedName: string;
  followerName: string;
}): Promise<void> {
  try {
    const { subject, html } = newFollowerEmail({
      followedName: args.followedName,
      followerName: args.followerName,
      manageUrl: `${BASE_URL}/moi`,
    });
    await sendSortieEmail({ to: args.to, subject, html });
  } catch (err) {
    console.error("[sortie/email] new-follower send failed", err);
  }
}
