import { expect, test } from "@playwright/test";

// `?host=sortie` override — CI runners don't have /etc/hosts entries for
// sortie.localhost.

test("sortie.colist.fr landing renders the placeholder", async ({ page }) => {
  await page.goto("/?host=sortie");

  await expect(page.getByText("Bientôt")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sortie", level: 1 })).toBeVisible();
  await expect(page.getByText(/Organise tes sorties culturelles entre amis/)).toBeVisible();
});

test("colist host is unaffected by the sortie routing", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Sortie", level: 1 })).toHaveCount(0);
});

test("www redirects /sortie/* to the sortie subdomain", async ({ request }) => {
  const response = await request.get("/sortie/abc", { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toBe("https://sortie.colist.fr/abc");
});
