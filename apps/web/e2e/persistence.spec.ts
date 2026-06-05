import { test, expect, type Page } from "@playwright/test";

// PH-F R3 — End-to-end persistence smoke. Covers the highest-anxiety
// regression: a user creates a deal, signs out, signs back in, and the
// deal is still there. If this passes, the multi-tenant write-through
// pipeline (Zustand → /api/deals → Neon → Pusher → hydrateFromServer)
// is at least functionally end-to-end on this deploy.
//
// We run in demo mode (no real signup needed) so the test stays fast
// and isolated. Demo mode shares an org id (`demo-org`) but each visit
// is independent — the test relies on the fact that /api/deals
// persists to Postgres tagged with that org id, so the row survives
// the auth round-trip even though the in-memory Zustand store is
// re-initialized.

async function loginAsDemo(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await expect(
    page.getByRole("button", { name: /Try instant demo/i }),
  ).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: /Try instant demo/i }).click();
  await page.waitForURL(/\/home/, { timeout: 30000 });
}

async function logout(page: Page) {
  // Logout has different entry points depending on the build (sidebar
  // popover vs. /settings). Hit the API directly — it's the
  // canonical clear-session path and doesn't depend on UI state.
  await page.evaluate(async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    localStorage.clear();
  });
}

test.describe("Persistence — deal survives logout/login", () => {
  test("demo user can create a deal, log out, log back in, and see it", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsDemo(page);

    // Navigate to CRM.
    await page.goto("/crm", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator("body")).toContainText(/CRM Pipeline/i, {
      timeout: 30000,
    });

    // Create a deal with a unique marker so we can spot it later. The
    // POST is what we're really testing — it should hit /api/deals and
    // persist to Postgres tagged with demo-org.
    const marker = `e2e-deal-${Date.now().toString(36)}`;
    const created = await page.evaluate(async (company: string) => {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          company,
          contactName: "Smoke Test Lead",
          value: 12345,
          stage: "Lead",
          assignee: "Preet",
          source: "e2e",
        }),
      });
      return { ok: res.ok, status: res.status };
    }, marker);
    expect(created.ok, "POST /api/deals must succeed").toBe(true);

    // Logout (server clears the cookie + localStorage cleared client-side).
    await logout(page);

    // Visit a protected page — middleware should redirect to /login.
    await page.goto("/crm", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // Login again as demo.
    await loginAsDemo(page);

    // Re-fetch the deal list — the marker we created should still be there.
    const list = await page.evaluate(async () => {
      const res = await fetch("/api/deals", { credentials: "same-origin" });
      return (await res.json()) as { deals?: Array<{ company: string }> };
    });
    const companies = (list.deals ?? []).map((d) => d.company);
    expect(companies, "deal must persist across logout/login").toContain(
      marker,
    );
  });
});
