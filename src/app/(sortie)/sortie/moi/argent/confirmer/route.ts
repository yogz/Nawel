import { and, count, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { auditLog, userPaymentMethods } from "@drizzle/sortie-schema";
import { ACCOUNT_PAYMENT_AUDIT_ACTION, hashIp } from "@/features/sortie/lib/audit";
import {
  checkConfirmToken,
  hashSessionId,
  hashConfirmToken,
} from "@/features/sortie/lib/account-payment/confirm-token";
import {
  MAX_ACCOUNT_METHODS,
  mayManageAccountMethods,
} from "@/features/sortie/lib/account-payment/rules";
import { sendAccountMethodChangedEmail } from "@/features/sortie/lib/emails/send-account-payment-emails";

// Drizzle + pg : pas compatible Edge. Cohérent avec /claim.
export const runtime = "nodejs";

const SORTIE_BASE = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(/\/$/, "");

/**
 * Lien du mail « Confirme ton nouveau moyen de paiement ». Confirme l'ajout
 * seulement si le compte connecté est celui qui l'a fait : il faut donc à
 * la fois la session ET la boîte mail du compte.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return backToAccount("invalide");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const u = session?.user;
  if (!u) {
    const self = `${SORTIE_BASE}/moi/argent/confirmer?t=${encodeURIComponent(token)}`;
    return NextResponse.redirect(
      new URL(`/login?callbackURL=${encodeURIComponent(self)}`, SORTIE_BASE)
    );
  }
  if (!mayManageAccountMethods({ userId: u.id, emailVerified: u.emailVerified ?? null })) {
    return backToAccount("invalide");
  }

  const tokenHash = hashConfirmToken(token);
  const row = await db.query.userPaymentMethods.findFirst({
    where: eq(userPaymentMethods.confirmTokenHash, tokenHash),
    columns: {
      id: true,
      userId: true,
      type: true,
      valuePreview: true,
      confirmTokenHash: true,
      confirmTokenExpiresAt: true,
      confirmedAt: true,
      confirmSessionHash: true,
    },
  });

  const now = new Date();
  const check = checkConfirmToken({
    row,
    sessionUserId: u.id,
    sessionHash: session ? hashSessionId(session.session.id) : null,
    now,
  });
  if (!check.ok || !row) {
    const reason = check.ok ? "invalid" : check.reason;
    return backToAccount(
      reason === "expired"
        ? "expire"
        : reason === "other-account"
          ? "autre-compte"
          : reason === "other-device"
            ? "autre-appareil"
            : "invalide"
    );
  }

  // Plafond revérifié ici : plusieurs ajouts en attente pourraient sinon
  // le dépasser une fois tous confirmés.
  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.userId, u.id), isNotNull(userPaymentMethods.confirmedAt)));
  if (confirmedCount >= MAX_ACCOUNT_METHODS) {
    return backToAccount("plein");
  }

  const ipHash = await hashIp();
  const confirmed = await db.transaction(async (tx) => {
    // Consommation atomique : un double clic ne confirme qu'une fois.
    const [updated] = await tx
      .update(userPaymentMethods)
      .set({ confirmedAt: now, confirmTokenHash: null, confirmTokenExpiresAt: null })
      .where(
        and(
          eq(userPaymentMethods.id, row.id),
          eq(userPaymentMethods.userId, u.id),
          eq(userPaymentMethods.confirmTokenHash, tokenHash),
          isNull(userPaymentMethods.confirmedAt),
          gt(userPaymentMethods.confirmTokenExpiresAt, now)
        )
      )
      .returning({ id: userPaymentMethods.id });
    if (!updated) {
      return false;
    }
    await tx.insert(auditLog).values({
      outingId: null,
      actorUserId: u.id,
      action: ACCOUNT_PAYMENT_AUDIT_ACTION.USER_PAYMENT_METHOD_CONFIRMED,
      ipHash,
      payload: JSON.stringify({
        methodId: row.id,
        type: row.type,
        valuePreview: row.valuePreview,
      }),
    });
    return true;
  });
  if (!confirmed) {
    return backToAccount("invalide");
  }

  await sendAccountMethodChangedEmail({
    to: u.email,
    change: "confirmed",
    type: row.type,
    valuePreview: row.valuePreview,
  });

  return backToAccount("confirme");
}

function backToAccount(outcome: string): NextResponse {
  return NextResponse.redirect(new URL(`/moi/argent?moyen=${outcome}#moyens`, SORTIE_BASE));
}
