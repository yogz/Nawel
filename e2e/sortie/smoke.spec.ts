import { expect, test } from "@playwright/test";

// `?host=sortie` override — CI runners don't have /etc/hosts entries for
// sortie.localhost.

test("sortie.colist.fr landing renders hero and CTA", async ({ page }) => {
  await page.goto("/?host=sortie");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /créer une sortie/i })).toBeVisible();
});

test("colist host is unaffected by the sortie routing", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  // The Sortie "Créer une sortie" CTA must not appear on the CoList host.
  await expect(page.getByRole("link", { name: /créer une sortie/i })).toHaveCount(0);
});

test("www redirects /sortie/* to the sortie subdomain", async ({ request }) => {
  const response = await request.get("/sortie/abc", { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toBe("https://sortie.colist.fr/abc");
});
