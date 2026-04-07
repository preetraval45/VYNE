import { test, expect } from "@playwright/test";

// Helper to set demo auth state in localStorage
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

test.describe("Chat / Messaging", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("should load chat page with channels and messages", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "load", timeout: 60000 });

    // Wait for the chat content to fully render - look for message content
    await expect(
      page.getByText("sprint review", { exact: false }),
    ).toBeVisible({ timeout: 30000 });

    // Channel name visible in header
    await expect(page.locator("text=general").first()).toBeVisible();
  });

  test("should send a message", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "load", timeout: 60000 });

    // Wait for messages to render
    await expect(
      page.getByText("sprint review", { exact: false }),
    ).toBeVisible({ timeout: 30000 });

    // Type and send a message
    const composer = page.locator("textarea");
    await composer.waitFor({ timeout: 10000 });
    await composer.fill("Hello from Playwright test!");
    await page.keyboard.press("Enter");

    // Message should appear in the chat
    await expect(
      page.getByText("Hello from Playwright test!"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should open AI summary panel", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "load", timeout: 60000 });

    // Wait for chat to render
    await expect(
      page.getByText("sprint review", { exact: false }),
    ).toBeVisible({ timeout: 30000 });

    // Click the Summarize button
    await page.locator("button", { hasText: "Summarize" }).click();

    // Summary panel should appear
    await expect(
      page.getByText("AI Thread Summary"),
    ).toBeVisible({ timeout: 15000 });
  });
});
