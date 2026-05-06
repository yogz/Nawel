"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth-config";
import { markAdminStepUp } from "@/features/admin/lib/admin-step-up";

// Server actions du flow step-up admin. Pourquoi pas authClient côté
// browser ? — le step-up doit poser le cookie `admin_stepup` HTTP-only,
// signé HMAC côté serveur. On garde donc le verify côté server action
// et on fait `markAdminStepUp(sessionId)` immédiatement après le succès
// du verify Better Auth, dans la même requête (pas de fenêtre TOCTOU).

type Result = { ok: true } | { ok: false; error: string };

async function loadAdminSession() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return { session, headers: h };
}

export async function verifyTotpAction(code: string): Promise<Result> {
  const ctx = await loadAdminSession();
  if (!ctx) {
    return { ok: false, error: "Accès refusé." };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Code invalide." };
  }

  try {
    await auth.api.verifyTOTP({ headers: ctx.headers, body: { code } });
  } catch {
    // Better Auth lève une APIError sur code invalide. On ne propage pas
    // le message brut — pas d'info de timing/contenu utile à un attaquant.
    return { ok: false, error: "Code invalide. Réessaie." };
  }

  await markAdminStepUp(ctx.session.session.id);
  return { ok: true };
}

export async function verifyBackupCodeAction(code: string): Promise<Result> {
  const ctx = await loadAdminSession();
  if (!ctx) {
    return { ok: false, error: "Accès refusé." };
  }
  if (code.length === 0) {
    return { ok: false, error: "Code requis." };
  }

  try {
    await auth.api.verifyBackupCode({ headers: ctx.headers, body: { code } });
  } catch {
    return { ok: false, error: "Code de secours invalide ou déjà utilisé." };
  }

  await markAdminStepUp(ctx.session.session.id);
  return { ok: true };
}
