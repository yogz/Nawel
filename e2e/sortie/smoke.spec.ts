import { expect, test } from "@playwright/test";

/**
 * Smoke test for the Sortie placeholder. Verifies that the hostname-first
 * proxy correctly rewrites to the (sortie) route group when the Host header
 * is Sortie, and that the landing page renders with the expected copy and
 * typography hook-up (serif heading).
 *
 * Uses `?host=sortie` because CI runners don't have /etc/hosts entries.
 */

test("sortie.colist.fr landing renders the placeholder", async ({ page }) => {
  await page.goto("/?host=sortie");

  await expect(page.getByText("Bientôt")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sortie", level: 1 })).toBeVisible();
  await expect(page.getByText(/Organise tes sorties culturelles entre amis/)).toBeVisible();
});

test("colist host is unaffected by the sortie routing", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  // The Sortie heading must NOT appear on the CoList host.
  await expect(page.getByRole("heading", { name: "Sortie", level: 1 })).toHaveCount(0);
});

test("www redirects /sortie/* to the sortie subdomain", async ({ request }) => {
  // Use the APIRequestContext so we see the raw redirect response without the
  // browser following it to a DNS target that doesn't resolve locally.
  const response = await request.get("/sortie/abc", { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  const location = response.headers()["location"];
  expect(location).toBe("https://sortie.colist.fr/abc");
});
