import { expect, test, type Page } from "@playwright/test";

// Requires migration 0020 applied — the create path queries sortie.outings.

async function createOuting(page: Page, title: string) {
  await page.goto("/nouvelle?host=sortie");

  await page.getByLabel("Titre de la sortie").fill(title);
  // Sixty days out so we're nowhere near today's edge cases.
  await page.getByLabel("Date et heure").fill("2026-12-12T20:30");
  await page.getByLabel("Réponse avant").fill("2026-12-05T20:00");
  await page.getByLabel("Lieu").fill("Salle Richelieu · Paris 1er");
  await page.getByLabel("Ton prénom").fill("Nicolas");

  await page.getByRole("button", { name: /publier ma sortie/i }).click();

  // createOutingAction redirects to /<slug>-<shortId>.
  await page.waitForURL(
    /\/[a-z0-9-]+-[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{8}(\?.*)?$/
  );
}

test("create → RSVP yes with guests → modify", async ({ page }) => {
  const title = `Macbeth ${Date.now()}`;
  await createOuting(page, title);

  // Outing page shows the title and an empty participant state.
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText(/personne n.*encore répondu/i)).toBeVisible();

  // Open the RSVP sheet and pick "J'en suis".
  await page.getByRole("button", { name: /je réponds/i }).click();
  await page.getByRole("button", { name: /j'en suis/i }).click();

  // Prénom is required; fill it in (cookie didn't pre-fill because we're a
  // fresh anon participant on this device).
  await page.getByLabel("Ton prénom").fill("Claire");

  // Add 1 adult + 1 child via the steppers.
  await page.getByRole("button", { name: /plus de adultes en plus/i }).click();
  await page.getByRole("button", { name: /plus de enfants en plus/i }).click();

  await page.getByRole("button", { name: /je confirme/i }).click();

  // Back on the outing page, the participant appears with the extras.
  await expect(page.getByText("Claire (+1 adulte, +1 enfant)")).toBeVisible();
  await expect(page.getByText(/a déjà dit oui/i)).toBeVisible();

  // Re-open the sheet — the button should now say "Modifier" and pre-fill.
  await page.getByRole("button", { name: /modifier ma réponse/i }).click();
  // Bring children back down to 0.
  await page.getByRole("button", { name: /moins de enfants en plus/i }).click();
  await page.getByRole("button", { name: /je confirme/i }).click();

  await expect(page.getByText("Claire (+1 adulte)")).toBeVisible();
});
