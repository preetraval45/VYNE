import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MfaPanel } from "../MfaPanel";

// MfaPanel calls /api/auth/session on mount + /api/auth/mfa/setup |
// /confirm | /disable on user actions. We mock fetch so the component
// drives through the phases without hitting the network.

const sessionResponse = (mfaEnabled: boolean) =>
  ({
    ok: true,
    json: async () => ({ user: { mfaEnabled } }),
  }) as unknown as Response;

const setupResponse = () =>
  ({
    ok: true,
    json: async () => ({
      secret: "JBSWY3DPEHPK3PXP",
      otpauthUrl:
        "otpauth://totp/Vyne:test@example.com?secret=JBSWY3DPEHPK3PXP",
      qrImageUrl:
        "https://api.qrserver.com/v1/create-qr-code/?data=foo&size=240x240",
    }),
  }) as unknown as Response;

const confirmResponse = (codes: string[]) =>
  ({
    ok: true,
    json: async () => ({ ok: true, recoveryCodes: codes }),
  }) as unknown as Response;

beforeEach(() => {
  // Mock clipboard for the "Copy all" path.
  Object.assign(globalThis.navigator, {
    clipboard: { writeText: vi.fn(() => Promise.resolve()) },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MfaPanel", () => {
  it("loads + shows the 'MFA is disabled' state when session reports no MFA", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(sessionResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const toast = vi.fn();
    render(<MfaPanel onToast={toast} />);
    await waitFor(() =>
      expect(screen.getByText(/MFA is disabled/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /Enable MFA/i }),
    ).toBeInTheDocument();
  });

  it("loads + shows the 'MFA is enabled' state + Disable button", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(sessionResponse(true));
    vi.stubGlobal("fetch", fetchMock);
    const toast = vi.fn();
    render(<MfaPanel onToast={toast} />);
    await waitFor(() =>
      expect(screen.getByText(/MFA is enabled/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /Disable/i }),
    ).toBeInTheDocument();
  });

  it("clicking 'Enable MFA' transitions into setup-scan + renders QR + secret", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sessionResponse(false))
      .mockResolvedValueOnce(setupResponse());
    vi.stubGlobal("fetch", fetchMock);
    const toast = vi.fn();
    render(<MfaPanel onToast={toast} />);
    const enableBtn = await screen.findByRole("button", {
      name: /Enable MFA/i,
    });
    await userEvent.click(enableBtn);
    await waitFor(() => {
      expect(
        screen.getByText(/Open your authenticator app/i),
      ).toBeInTheDocument();
      expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
      expect(screen.getByAltText("MFA setup QR code")).toBeInTheDocument();
    });
  });

  it("blocks Confirm until 6 digits are entered", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sessionResponse(false))
      .mockResolvedValueOnce(setupResponse());
    vi.stubGlobal("fetch", fetchMock);
    const toast = vi.fn();
    render(<MfaPanel onToast={toast} />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Enable MFA/i }),
    );
    const confirm = await screen.findByRole("button", {
      name: /Confirm \+ enable/i,
    });
    expect(confirm).toBeDisabled();
    const input = screen.getByPlaceholderText("123 456");
    await userEvent.type(input, "123456");
    expect(confirm).not.toBeDisabled();
  });

  it("on successful confirm, shows the recovery codes panel", async () => {
    const codes = Array.from({ length: 10 }, (_, i) => `code-${i}-aabb-cc`);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sessionResponse(false))
      .mockResolvedValueOnce(setupResponse())
      .mockResolvedValueOnce(confirmResponse(codes));
    vi.stubGlobal("fetch", fetchMock);
    const toast = vi.fn();
    render(<MfaPanel onToast={toast} />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Enable MFA/i }),
    );
    const input = await screen.findByPlaceholderText("123 456");
    await userEvent.type(input, "123456");
    await userEvent.click(
      screen.getByRole("button", { name: /Confirm \+ enable/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Save these recovery codes now/i),
      ).toBeInTheDocument(),
    );
    // Spot-check the first + last codes are visible.
    expect(screen.getByText(codes[0])).toBeInTheDocument();
    expect(screen.getByText(codes[9])).toBeInTheDocument();
    // Toast fired with "Two-factor authentication enabled".
    expect(toast).toHaveBeenCalledWith("Two-factor authentication enabled");
  });
});
