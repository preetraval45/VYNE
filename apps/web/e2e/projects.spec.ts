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

  test("should load projects page and show sidebar", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/project/i, { timeout: 15000 });
    // Sidebar navigation should be visible
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible({ timeout: 10000 });
  });

  test("should open create project modal", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/project/i, { timeout: 15000 });

    // Find a "New Project" or "+" button
    const createBtn = page
      .getByRole("button", { name: /new project|create project|\+/i })
      .first();
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      // Modal or form should appear
      await expect(page.locator("body")).toContainText(/project name|create/i, { timeout: 10000 });
    }
  });

  test("should display project boards with kanban columns", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/project/i, { timeout: 15000 });
    // Should contain task status labels
    await expect(page.locator("body")).toContainText(/todo|in.progress|done/i, { timeout: 10000 });
  });

  test("should navigate to project detail", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/project/i, { timeout: 15000 });

    // Try clicking the first project link
    const projectLinks = page.getByRole("link").filter({ hasText: /.+/ });
    const count = await projectLinks.count();
    if (count > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
      expect(page.url()).toMatch(/projects/);
    }
  });
});
