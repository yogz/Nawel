import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright runs the Sortie smoke suite against the dev server.
 *
 * The Sortie app is served on the same port as CoList, routed by src/proxy.ts
 * based on the Host header. For CI, `/etc/hosts` won't have an entry for
 * `sortie.localhost`, so tests use the `?host=sortie` query override the
 * proxy recognises in development.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    // Uses a dedicated port so a stray CoList or peer dev server on 3000/3001
    // doesn't collide with the test run.
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
