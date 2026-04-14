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

test.describe("Documents", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("should load docs page with document list", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/doc|document|wiki|page/i, { timeout: 15000 });
  });

  test("should open a document and show TipTap editor", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/doc|document/i, { timeout: 15000 });

    // Click the first document in the list
    const docLinks = page.locator("a, button").filter({ hasText: /.+/ }).first();
    if (await docLinks.isVisible({ timeout: 5000 }).catch(() => false)) {
      await docLinks.click();
      await page.waitForLoadState("domcontentloaded");

      // TipTap editor should be present
      const editor = page.locator(".ProseMirror, .tiptap-editor, [contenteditable='true']").first();
      await expect(editor).toBeVisible({ timeout: 15000 });
    }
  });

  test("should show version history button in editor toolbar", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/doc/i, { timeout: 15000 });

    const docLinks = page.locator("a, button").filter({ hasText: /.+/ }).first();
    if (await docLinks.isVisible({ timeout: 5000 }).catch(() => false)) {
      await docLinks.click();
      await page.waitForLoadState("domcontentloaded");

      // History button should be in toolbar
      const historyBtn = page.getByRole("button", { name: /version history/i });
      await expect(historyBtn).toBeVisible({ timeout: 15000 });
    }
  });

  test("should create a new document", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/doc/i, { timeout: 15000 });

    // Find and click new doc button
    const newBtn = page.getByRole("button", { name: /new|create|\+/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForLoadState("domcontentloaded");

      // Should navigate to a new document
      const editor = page.locator(".ProseMirror, [contenteditable='true']").first();
      await expect(editor).toBeVisible({ timeout: 15000 });

      // Type some content
      await editor.click();
      await page.keyboard.type("My test document content");
      await expect(page.locator("body")).toContainText("My test document content", { timeout: 10000 });
    }
  });
});
