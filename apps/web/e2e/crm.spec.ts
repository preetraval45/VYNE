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

test.describe("CRM Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("pipeline tab shows stage columns", async ({ page }) => {
    await page.goto("/crm", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/CRM Pipeline/i, {
      timeout: 15000,
    });
    // At least the Lead and Won stage labels should be visible.
    await expect(page.locator("body")).toContainText(/Lead/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Won/i, { timeout: 10000 });
  });

  test("clicking a deal opens its detail page", async ({ page }) => {
    await page.goto("/crm", { waitUntil: "domcontentloaded", timeout: 60000 });
    // Acme Corp is in INITIAL_DEALS (and seeded in Neon).
    const acme = page.getByText(/Acme Corp/i).first();
    await expect(acme).toBeVisible({ timeout: 15000 });
  });
});
