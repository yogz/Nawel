import { expect, test, type Page } from "@playwright/test";
import { authenticator } from "otplib";

// E2E du flow 2FA admin. Préconditions, à automatiser dans un fichier
// setup séparé si on veut faire tourner ça en CI :
//
//   1. Un user admin a été créé (rôle = "admin", email + password connus).
//   2. La 2FA n'est PAS encore enrôlée (`twoFactorEnabled = false`).
//
// Pour l'instant ces tests sont semi-manuels : tu fixtures via
// `npx tsx scripts/create-admin.ts` + un cleanup à la main entre runs.
// Si tu veux faire tourner en CI, ajouter une route /api/test/* (DEV-only,
// gardée derrière process.env.NODE_ENV !== "production") qui :
//   - reset 2FA d'un user de test
//   - revient à l'état "admin sans 2FA"
//
// Sécurité : ces specs ne doivent pas être exécutés contre la prod —
// le `webServer` du config Playwright lance déjà un dev local dédié.

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin-e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-E2E-12345";

test.describe.skip("admin 2FA flow", () => {
  // skip par défaut : ces tests cassent sans fixture admin pré-créée. Retire
  // le `.skip` quand tu as setup les fixtures (ou ajoute la route /api/test
  // mentionnée plus haut).

  async function login(page: Page) {
    await page.goto("/login?host=sortie");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /se connecter/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  }

  test("admin sans 2FA enrôlée → forcé sur /admin/2fa-enroll", async ({ page }) => {
    await login(page);
    await page.goto("/admin?host=sortie");
    // Le gate `requireSortieAdmin` redirige vers /admin/2fa-enroll quand
    // user.twoFactorEnabled === false.
    await page.waitForURL(/\/admin\/2fa-enroll/);
    await expect(page.getByRole("heading", { name: /activer la 2fa/i })).toBeVisible();
  });

  test("flow d'enrollment complet → accès admin OK", async ({ page }) => {
    await login(page);
    await page.goto("/admin/2fa-enroll?host=sortie");

    // Étape 1 : password
    await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /continuer/i }).click();

    // Étape 2 : QR + backup codes affichés
    await expect(page.getByText(/codes de secours/i)).toBeVisible();
    // Le `data.totpURI` n'est pas exposé au DOM directement (rendu en
    // image base64). Pour récupérer le secret on a besoin d'un test
    // helper ou d'intercepter l'XHR. Ici on TODO : intercept request à
    // `/api/auth/two-factor/enable` et lire le body.

    // Workaround temporaire : skip jusqu'à mise en place de l'intercept.
    test.skip(true, "TOTP secret extraction not implemented — voir helper /api/test");
  });

  test("step-up TOTP après expiration → re-challenge", async () => {
    test.skip(true, "Nécessite manipulation cookie admin_stepup côté test");
    // Plan : poser un cookie admin_stepup expiré (TTL passé) via
    // context.addCookies, vérifier que /admin redirige sur /admin/2fa-challenge.
  });

  test("magic-link login admin → bloqué sur step-up avant /admin", async () => {
    test.skip(true, "Nécessite extraction du token magic-link depuis Resend mock");
    // Plan : trigger magic-link, intercept l'email, follow le lien, puis
    // goto /admin → expect redirect /admin/2fa-challenge (magic-link ne
    // pose pas le step-up).
  });

  test("backup code path", async () => {
    test.skip(true, "Nécessite fixture avec backup code connu");
    // Plan : enroller via API, récupérer un backup code, logout, login,
    // /admin → /admin/2fa-challenge → switch backup → saisir → expect /admin OK.
  });

  // Garde-fou de doc : authenticator est importé pour les tests futurs
  // qui auront accès au TOTP secret.
  test("noop — verify otplib import", () => {
    expect(typeof authenticator.generate).toBe("function");
  });
});
