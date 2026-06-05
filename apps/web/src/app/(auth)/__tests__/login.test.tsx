// PH-F R3 — re-aligned to the current LoginPage shape:
//   • email/password/showPassword/isLoading/error live in local useState
//   • the form POSTs to /api/auth/login via raw `fetch` (not authApi)
//   • a successful response with `step: "mfa"` switches to a second step
//   • the demo button hits /api/auth/session and then router.push("/home")
//
// The previous test suite asserted behaviour that no longer exists
// (Zustand-driven isLoading, authApi.login mock). Those assertions are
// dropped; what's kept is the contract that actually matters in prod.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent } from "@/test/utils";
import { waitFor, fireEvent, act } from "@testing-library/react";
import LoginPage from "../login/page";
import { useAuthStore } from "@/lib/stores/auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

// markDemoSession writes to localStorage + a cookie; we want to confirm
// the demo button still works without doing any IO.
vi.mock("@/lib/stores/seedMode", () => ({
  markDemoSession: vi.fn(),
  clearDemoSession: vi.fn(),
}));

const okResponse = (body: unknown): Response =>
  ({ ok: true, json: async () => body }) as unknown as Response;
const errResponse = (status: number, body: unknown): Response =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null,
  });
  mockPush.mockReset();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("renders the email + password fields and the Sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Sign in$/i }),
    ).toBeInTheDocument();
  });

  it("renders the welcome heading + subhead", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to your VYNE workspace/),
    ).toBeInTheDocument();
  });

  it("links to the signup page", () => {
    render(<LoginPage />);
    const link = screen.getByText("Join the waitlist");
    expect(link.closest("a")).toHaveAttribute("href", "/signup");
  });

  it("links to forgot password", () => {
    render(<LoginPage />);
    const link = screen.getByText("Forgot password?");
    expect(link.closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  it("allows typing in the email + password fields", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    // userEvent.paste is more robust than .type for controlled inputs
    // in React 19 + jsdom — .type can reset the caret to 0 on each React
    // commit, which causes the string to land in reverse. .paste fires
    // a single onChange with the full value.
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    email.focus();
    await user.paste("preet@vyne.ai");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "preet@vyne.ai",
    );
    const pass = screen.getByLabelText("Password") as HTMLInputElement;
    pass.focus();
    await user.paste("mypassword");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(
      "mypassword",
    );
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe(
      "password",
    );
    await user.click(screen.getByLabelText(/Show password/));
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe(
      "text",
    );
  });

  it("redirects to /home on successful (non-MFA) login", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      okResponse({
        token: "jwt-123",
        user: {
          id: "u1",
          email: "preet@vyne.ai",
          name: "Preet",
          orgId: "org-1",
          role: "owner",
          createdAt: "2026-01-01T00:00:00Z",
          modules: ["messaging"],
          companyName: "ACME",
          plan: "pro",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "preet@vyne.ai");
    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home");
    });
  });

  it("shows the inline error when /api/auth/login returns non-2xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        errResponse(401, { error: "Invalid credentials" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "x@y.z");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("switches to the 6-digit MFA step when the login response asks for it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        okResponse({ step: "mfa", mfaSessionToken: "mfa-tok-abc" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "x@y.z");
    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Authentication code/i)).toBeInTheDocument();
    });
    // The "Verify" button is disabled until we type 6 digits.
    const verifyBtn = screen.getByRole("button", { name: /^Verify$/i });
    expect(verifyBtn).toBeDisabled();
  });

  it("enables demo mode without calling the login API", async () => {
    // Demo button calls /api/auth/session — mock it.
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: /Try instant demo/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/home"));
    // /api/auth/login was NEVER hit — only /api/auth/session.
    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.some((url) => url.includes("/api/auth/session"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/auth/login"))).toBe(false);
    // Auth store was populated with the demo user.
    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("demo");
    expect(state.token).toBe("demo-token");
  });
});
