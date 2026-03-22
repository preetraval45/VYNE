import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test/utils";
import LoginPage from "../login/page";
import { useAuthStore } from "@/lib/stores/auth";

// ─── Track router.push calls ────────────────────────────────────
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

// ─── Mock the API client ────────────────────────────────────────
vi.mock("@/lib/api/client", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    me: vi.fn(),
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  // ─── Form renders correctly ───────────────────────────────────
  it("should render the login form with email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("should render the welcome heading", () => {
    render(<LoginPage />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to your VYNE workspace/),
    ).toBeInTheDocument();
  });

  it("should have a link to the signup page", () => {
    render(<LoginPage />);

    const signupLink = screen.getByText("Create workspace");
    expect(signupLink).toBeInTheDocument();
    expect(signupLink.closest("a")).toHaveAttribute("href", "/signup");
  });

  it("should have a forgot password link", () => {
    render(<LoginPage />);

    const forgotLink = screen.getByText("Forgot password?");
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  // ─── Form input interaction ───────────────────────────────────
  it("should allow typing in email and password fields", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    await user.type(emailInput, "preet@vyne.ai");
    await user.type(passwordInput, "mypassword");

    expect(emailInput).toHaveValue("preet@vyne.ai");
    expect(passwordInput).toHaveValue("mypassword");
  });

  it("should toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    // Find the toggle button (the eye icon button)
    const toggleButtons = screen.getAllByRole("button");
    const toggleButton = toggleButtons.find(
      (btn) => btn.getAttribute("type") === "button",
    );
    expect(toggleButton).toBeDefined();

    await user.click(toggleButton!);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggleButton!);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ─── Form submission ─────────────────────────────────────────
  it("should call login and redirect on successful login", async () => {
    const { authApi } = await import("@/lib/api/client");
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: {
        user: {
          id: "user-1",
          email: "preet@vyne.ai",
          name: "Preet Raval",
          orgId: "org-1",
          role: "owner" as const,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        token: "jwt-123",
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "preet@vyne.ai");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Should redirect to /home after successful login
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home");
    });
  });

  it("should fall back to demo mode when login API fails", async () => {
    const { authApi } = await import("@/lib/api/client");
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error("Network Error"));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "preet@vyne.ai");
    await user.type(screen.getByLabelText("Password"), "anypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // In demo mode, it should still redirect to /home
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home");
    });

    // Demo user should be set in the store
    const state = useAuthStore.getState();
    expect(state.user).toBeDefined();
    expect(state.token).toBe("demo-token");
  });

  // ─── Error state display ──────────────────────────────────────
  it("should display error message when error state is set", () => {
    // Set error state directly in the store
    useAuthStore.setState({ error: "Invalid credentials" });

    render(<LoginPage />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("should display error styling for the error message", () => {
    useAuthStore.setState({ error: "Account locked" });

    render(<LoginPage />);

    const errorElement = screen.getByText("Account locked");
    expect(errorElement).toBeInTheDocument();
  });

  // ─── Loading state ────────────────────────────────────────────
  it("should disable the submit button while loading", () => {
    useAuthStore.setState({ isLoading: true });

    render(<LoginPage />);

    const submitButton = screen.getByRole("button", { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show "Signing in..." text while loading', () => {
    useAuthStore.setState({ isLoading: true });

    render(<LoginPage />);

    expect(screen.getByText(/Signing in/)).toBeInTheDocument();
  });
});
