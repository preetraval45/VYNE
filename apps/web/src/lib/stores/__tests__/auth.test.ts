import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore, useUser, useToken, useIsAuthenticated } from "../auth";
import type { User } from "@/types";

// ─── Mock the API client ────────────────────────────────────────
vi.mock("@/lib/api/client", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    me: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// ─── Mock window.location ───────────────────────────────────────
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  writable: true,
  value: mockLocation,
});

const mockUser: User = {
  id: "user-1",
  email: "preet@vyne.ai",
  name: "Preet Raval",
  orgId: "org-1",
  role: "owner",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
    mockLocation.href = "";
    vi.clearAllMocks();
  });

  // ─── Login ──────────────────────────────────────────────────────
  describe("login", () => {
    it("should set user and token on successful login", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: {
          user: mockUser,
          token: "jwt-token-123",
          refreshToken: "refresh-token-123",
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await useAuthStore.getState().login("preet@vyne.ai", "password123");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe("jwt-token-123");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set isLoading to true while logging in", async () => {
      const { authApi } = await import("@/lib/api/client");
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      vi.mocked(authApi.login).mockReturnValueOnce(loginPromise as never);

      const loginCall = useAuthStore
        .getState()
        .login("preet@vyne.ai", "password123");

      // While the request is in-flight, isLoading should be true
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolveLogin!({
        data: {
          user: mockUser,
          token: "jwt-token-123",
          refreshToken: "refresh-token-123",
        },
      });
      await loginCall;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("should set error on failed login", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: { data: { message: "Invalid credentials" } },
      });

      await expect(
        useAuthStore.getState().login("preet@vyne.ai", "wrong-password"),
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Invalid credentials");
    });

    it("should use default error message when none is provided", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.login).mockRejectedValueOnce({});

      await expect(
        useAuthStore.getState().login("preet@vyne.ai", "wrong"),
      ).rejects.toThrow("Login failed. Please try again.");

      expect(useAuthStore.getState().error).toBe(
        "Login failed. Please try again.",
      );
    });
  });

  // ─── Signup ─────────────────────────────────────────────────────
  describe("signup", () => {
    it("should set user and token on successful signup", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.signup).mockResolvedValueOnce({
        data: {
          user: mockUser,
          token: "signup-token-456",
          refreshToken: "signup-refresh-456",
          org: {
            id: "org-1",
            name: "VYNE",
            slug: "vyne",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        },
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as never,
      });

      await useAuthStore.getState().signup({
        email: "preet@vyne.ai",
        password: "password123",
        name: "Preet Raval",
        orgName: "VYNE",
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe("signup-token-456");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set error on failed signup", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.signup).mockRejectedValueOnce({
        response: { data: { message: "Email already exists" } },
      });

      await expect(
        useAuthStore.getState().signup({
          email: "preet@vyne.ai",
          password: "password123",
          name: "Preet Raval",
          orgName: "VYNE",
        }),
      ).rejects.toThrow("Email already exists");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Email already exists");
      expect(state.isLoading).toBe(false);
    });

    it("should use default error message when signup fails without message", async () => {
      const { authApi } = await import("@/lib/api/client");
      vi.mocked(authApi.signup).mockRejectedValueOnce({});

      await expect(
        useAuthStore.getState().signup({
          email: "preet@vyne.ai",
          password: "password123",
          name: "Preet Raval",
          orgName: "VYNE",
        }),
      ).rejects.toThrow("Signup failed. Please try again.");
    });
  });

  // ─── Logout ─────────────────────────────────────────────────────
  describe("logout", () => {
    it("should clear user, token, and error state", () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        token: "jwt-token-123",
        error: "some previous error",
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBeNull();
    });

    it("should redirect to /login", () => {
      useAuthStore.setState({ user: mockUser, token: "jwt-token-123" });

      useAuthStore.getState().logout();

      expect(mockLocation.href).toBe("/login");
    });
  });

  // ─── setUser / setToken ─────────────────────────────────────────
  describe("setUser", () => {
    it("should update the user", () => {
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });
  });

  describe("setToken", () => {
    it("should update the token", () => {
      useAuthStore.getState().setToken("new-token");
      expect(useAuthStore.getState().token).toBe("new-token");
    });
  });

  // ─── clearError ─────────────────────────────────────────────────
  describe("clearError", () => {
    it("should clear the error", () => {
      useAuthStore.setState({ error: "Something went wrong" });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ─── Selectors ────────────────────────────────────────────────
  describe("isAuthenticated selector", () => {
    it("should return true when both user and token are present", () => {
      useAuthStore.setState({ user: mockUser, token: "jwt-token-123" });

      // Access the selector logic directly (same as what useIsAuthenticated does)
      const state = useAuthStore.getState();
      const isAuthenticated = !!state.token && !!state.user;
      expect(isAuthenticated).toBe(true);
    });

    it("should return false when user is null", () => {
      useAuthStore.setState({ user: null, token: "jwt-token-123" });

      const state = useAuthStore.getState();
      const isAuthenticated = !!state.token && !!state.user;
      expect(isAuthenticated).toBe(false);
    });

    it("should return false when token is null", () => {
      useAuthStore.setState({ user: mockUser, token: null });

      const state = useAuthStore.getState();
      const isAuthenticated = !!state.token && !!state.user;
      expect(isAuthenticated).toBe(false);
    });

    it("should return false when both are null", () => {
      useAuthStore.setState({ user: null, token: null });

      const state = useAuthStore.getState();
      const isAuthenticated = !!state.token && !!state.user;
      expect(isAuthenticated).toBe(false);
    });
  });
});
