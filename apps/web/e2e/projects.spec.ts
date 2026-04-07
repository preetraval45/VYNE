import { test, expect } from "@playwright/test";

async function loginAsDemo(page: import("@playwright/test").Page) {
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

test.describe("Projects", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("should load projects page", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Page should have projects content
    await expect(page.locator("body")).toContainText(/project/i, {
      timeout: 15000,
    });
  });
});
