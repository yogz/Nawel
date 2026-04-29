"use server";

import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendSortieEmail } from "@/lib/resend-sortie";
import { magicLinks, outings } from "@drizzle/sortie-schema";
import { hashToken } from "@/features/sortie/lib/cookie-token";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { renderEmail } from "@/features/sortie/lib/emails/layout";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { z } from "zod";
import type { FormActionState } from "./outing-actions";
import { shortIdSchema } from "./schemas";

const requestReclaimSchema = z.object({
  shortId: shortIdSchema,
  email: z.string().trim().email().max(255),
});

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendReclaimMagicLinkAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = requestReclaimSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { shortId, email } = parsed.data;

  // Rate-limit by email AND by shortId to blunt bombing. Silent success on
  // every other failure so the response shape is identical whether the email
  // matches or not — prevents address enumeration.
  const gate = await rateLimit({
    key: `reclaim:${email.toLowerCase()}`,
    limit: 3,
    windowSeconds: 900,
  });
  if (!gate.ok) {
    return { message: "Trop de demandes — réessaie dans quelques minutes." };
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });

  if (outing?.creatorAnonEmail && outing.creatorAnonEmail.toLowerCase() === email.toLowerCase()) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await db.insert(magicLinks).values({
      tokenHash,
      outingId: outing.id,
      email: outing.creatorAnonEmail,
      expiresAt,
    });

    const link = `${BASE_URL}/claim?t=${rawToken}`;
    const title = escapeHtml(outing.title);
    const body = `
      <h1 style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:30px;line-height:1.1;letter-spacing:-0.03em;font-weight:800;color:#0A0A0A;">Reprendre la main sur ${title}</h1>
      <p style="color:#3A3833;line-height:1.6;font-size:15px;margin:0 0 28px;">Clique sur ce lien pour récupérer les droits de modif depuis cet appareil. Le lien expire dans 24 heures.</p>
      <p style="margin:0 0 24px;">
        <a href="${link}" style="display:inline-block;padding:14px 26px;background:#0A0A0A;color:#C7FF3C;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.01em;">Reprendre la sortie</a>
      </p>
      <p style="font-size:13px;color:#7A7368;line-height:1.6;margin:0;">Si tu n&rsquo;es pas à l&rsquo;origine de cette demande, ignore ce mail — le lien ne sera jamais activé.</p>
    `;
    await sendSortieEmail({
      to: email,
      subject: `Ton lien de secours pour ${outing.title}`,
      html: renderEmail({
        preheader: `Lien de secours pour reprendre la main sur ${outing.title}.`,
        body,
      }),
    });
  }

  // Same response regardless of outcome — no "cet email n'est pas reconnu".
  return {
    message: "Si cet email est celui du créateur, un lien vient de partir. Vérifie ta boîte.",
  };
}
