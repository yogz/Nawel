import { sendSortieEmail } from "@/lib/resend-sortie";
import { newFollowerEmail } from "./templates";

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

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
 * Notifie le créateur quand quelqu'un commence à le suivre. La relation
 * reste valide même si l'envoi échoue — c'est juste un heads-up. Skip
 * silencieux si pas d'email côté créateur (compte sans email vérifié).
 */
export async function sendNewFollowerEmail(args: {
  creator: { email: string | null; name: string };
  followerName: string;
}): Promise<void> {
  if (!args.creator.email) {
    return;
  }
  const { subject, html } = newFollowerEmail({
    followedName: args.creator.name,
    followerName: args.followerName,
    manageUrl: `${BASE_URL}/moi`,
  });
  await safeSend({ to: args.creator.email, subject, html, trigger: "new-follower" });
}
