import { test, expect } from "@playwright/test";

async function loginAsDemo(page: import("@playwright/test").Page) {
  await page.goto("/login");
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

test.describe("Documents", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("should load docs page", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");

    // Page should load and show docs content
    await expect(page.locator("body")).toContainText(/doc|document|wiki|page/i, {
      timeout: 10000,
    });
  });
});
