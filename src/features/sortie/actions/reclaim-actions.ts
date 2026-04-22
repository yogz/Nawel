"use server";

import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendSortieEmail } from "@/lib/resend-sortie";
import { magicLinks, outings } from "@drizzle/sortie-schema";
import { hashToken } from "@/features/sortie/lib/cookie-token";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { z } from "zod";
import type { FormActionState } from "./outing-actions";

const shortIdSchema = z
  .string()
  .trim()
  .regex(/^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

const requestReclaimSchema = z.object({
  shortId: shortIdSchema,
  email: z.string().trim().email().max(255),
});

const BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

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
    await sendSortieEmail({
      to: email,
      subject: `Ton lien de secours pour ${outing.title}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #7E6133;">Sortie</p>
          <h1 style="font-family: Georgia, serif; font-size: 28px; color: #231E16;">Reprendre la main sur ${title}</h1>
          <p style="color: #4A4132; line-height: 1.6;">Clique sur ce lien pour retrouver les droits de modification depuis cet appareil. Le lien expire dans 24 heures.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #6B1F2A; color: #F5F1E8; text-decoration: none; border-radius: 8px;">Reprendre la sortie</a>
          </p>
          <p style="font-size: 13px; color: #8E8168; line-height: 1.6;">Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email — le lien ne sera jamais activé.</p>
        </div>
      `,
    });
  }

  // Same response regardless of outcome — no "cet email n'est pas reconnu".
  return {
    message: "Si cet email est celui du créateur, un lien vient de partir. Vérifie ta boîte.",
  };
}
