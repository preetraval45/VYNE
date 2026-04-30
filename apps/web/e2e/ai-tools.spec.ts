import { test, expect, type Page } from "@playwright/test";

// E2E for the AI tool-calling layer. Verifies the round-trip:
//   user types a mutation phrase in /ai/chat
//   → /api/ai/tools returns structured toolCalls
//   → toolExecutor.ts runs them against the CRM Zustand store
//   → ToolResultPills render under the assistant message
//
// We mock /api/ai/tools so the test is deterministic and doesn't
// require a Groq / Anthropic key.

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

test.describe("AI tool-calling", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    // Stub the tool-call endpoint so the test is hermetic.
    await page.route("**/api/ai/tools", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Created the deal.",
          toolCalls: [
            {
              tool: "createDeal",
              args: {
                company: "Playwright Inc",
                value: 5000,
                stage: "Lead",
              },
              rationale: "User asked to create a deal",
            },
          ],
          provider: "vyne",
        }),
      });
    });
  });

  test("creating a deal via AI shows a tool-result chip", async ({ page }) => {
    await page.goto("/ai/chat", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill("Create a deal for Playwright Inc worth $5000");

    // Click the send button — falls through to "Stop" button if pending.
    const sendBtn = page
      .getByRole("button", { name: /send message|send/i })
      .first();
    if (await sendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await textarea.press("Enter");
    }

    await expect(
      page.getByText(/Created deal — Playwright Inc/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
