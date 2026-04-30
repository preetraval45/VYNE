import { test, expect, type Page } from "@playwright/test";

async function loginAsDemo(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem(
      "vyne-auth",
      JSON.stringify({
        state: {
          user: {
            id: "demo",
            email: "preet@vyne.ai",
            name: "Preet Raval",
            orgId: "demo-org",
            role: "owner",
            createdAt: new Date().toISOString(),
          },
          token: "demo-token",
          refreshToken: "demo-refresh",
        },
        version: 0,
      }),
    );
  });
}

test.describe("Code & DevOps", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("loads with stat cards + DORA card + env matrix", async ({ page }) => {
    await page.goto("/code", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/Code/i, { timeout: 15000 });
    await expect(page.locator("body")).toContainText(/DORA metrics/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Environment matrix/i, { timeout: 10000 });
  });

  test("recent deployments table renders rows", async ({ page }) => {
    await page.goto("/code", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/Recent Deployments/i, {
      timeout: 10000,
    });
    // Stat: deployments-this-week label exists
    await expect(page.locator("body")).toContainText(/Deployments This Week/i, {
      timeout: 10000,
    });
  });
});
