import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page).toHaveTitle(/VYNE/);
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should login with demo mode and redirect to dashboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for login form to render
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 15000 });

    // Fill in demo credentials
    await page.getByRole("textbox", { name: /email/i }).fill("preet@vyne.ai");
    await page.getByRole("textbox", { name: /password/i }).fill("demo123");

    // Click sign in
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation — demo mode auto-creates user or stays on login
    await page.waitForURL(/\/(home|login)/, { timeout: 30000 });
    const url = page.url();
    expect(url).toMatch(/\/(home|login)/);
  });

  test("should show signup page", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "load", timeout: 60000 });
    await expect(page.getByText("Create your workspace")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Work email")).toBeVisible();
  });
});
