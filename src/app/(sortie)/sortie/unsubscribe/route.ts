import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { verifyOptOutToken } from "@/features/sortie/lib/emails/follower-broadcast/opt-out-token";

// Runtime Node — Drizzle/pg pas Edge-compatible, cohérent avec les
// autres routes /sortie/**.
export const runtime = "nodejs";

/**
 * One-click unsubscribe pour les emails "nouvelle sortie d'un user que
 * tu suis". Le token HMAC porte le `userId` du destinataire.
 *
 * - GET  : flow utilisateur normal (clic sur le lien dans l'email).
 *          Affiche une page HTML de confirmation. Pas d'auth requise —
 *          le token signé prouve la possession de l'email associé.
 * - POST : flow RFC 8058 / Gmail one-click (List-Unsubscribe-Post).
 *          Réponse 200 vide ; le mail client appelle ça en arrière-plan
 *          quand l'utilisateur clique le bouton "Désabonner" natif de
 *          son inbox.
 *
 * L'opération est idempotente — re-cliquer ne crée rien d'anormal,
 * `notifyOnFollowedOuting` reste false. Si le user a re-activé depuis
 * /moi puis re-clique le vieux lien, ça redésactive : comportement
 * cohérent avec l'intent de l'email original.
 */

async function disableNotifications(token: string | null): Promise<{ ok: boolean }> {
  if (!token) {
    return { ok: false };
  }
  const verified = verifyOptOutToken(token);
  if (!verified) {
    return { ok: false };
  }
  await db.update(user).set({ notifyOnFollowedOuting: false }).where(eq(user.id, verified.uid));
  return { ok: true };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("t");
  const result = await disableNotifications(token);

  if (!result.ok) {
    return new NextResponse(htmlError(), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(htmlConfirmed(), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // RFC 8058 : la requête peut venir avec le token soit en query, soit
  // dans le body form-urlencoded. On accepte les deux.
  let token = request.nextUrl.searchParams.get("t");
  if (!token) {
    try {
      const body = await request.formData();
      const fromBody = body.get("t");
      if (typeof fromBody === "string") {
        token = fromBody;
      }
    } catch {
      // pas de body form — pas grave, on a déjà essayé la query
    }
  }
  const result = await disableNotifications(token);
  return new NextResponse("", { status: result.ok ? 200 : 400 });
}

function htmlConfirmed(): string {
  return baseHtml({
    title: "Désabonné·e",
    eyebrow: "─ c'est fait ─",
    body: `Tu ne recevras plus d&rsquo;emails quand un user que tu suis crée une sortie.<br />
Pour réactiver, va dans <strong>/moi</strong> &gt; Notifications.`,
  });
}

function htmlError(): string {
  return baseHtml({
    title: "Lien invalide",
    eyebrow: "─ erreur ─",
    body: `Ce lien de désabonnement est invalide ou corrompu.<br />
Tu peux gérer tes notifications depuis <strong>/moi</strong>.`,
  });
}

function baseHtml(args: { title: string; eyebrow: string; body: string }): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${args.title} · Sortie</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#F5F2EB;min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <div style="max-width:480px;padding:36px 24px;text-align:left;">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#FF3D81;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#FF3D81;vertical-align:middle;margin-right:8px;"></span>Sortie
      </p>
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:#7A7368;">${args.eyebrow}</p>
      <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;letter-spacing:-0.03em;font-weight:800;color:#F5F2EB;">${args.title}</h1>
      <p style="margin:0;color:#AEAEB2;line-height:1.6;font-size:15px;">${args.body}</p>
    </div>
  </body>
</html>`;
}
