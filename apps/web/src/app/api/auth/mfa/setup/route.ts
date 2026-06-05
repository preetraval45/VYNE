// PH-D — POST /api/auth/mfa/setup
//
// Generates a TOTP secret + otpauth URI + QR image URL for the signed-
// in user. The secret is NOT persisted here — it's returned to the
// client and posted back to /api/auth/mfa/confirm together with the
// first scanned code so we know the user successfully paired their
// authenticator. This avoids leaving a half-configured secret on the
// User row if the user abandons the flow.

import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/auth/tenantGuard";
import { generateMfaSecret } from "@/lib/auth/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await resolveTenant(req);
  if (!ctx || ctx.demo) {
    return NextResponse.json(
      { error: "Sign in with a real account to enable MFA" },
      { status: 401 },
    );
  }
  try {
    const { secret, otpauthUrl, qrImageUrl } = generateMfaSecret(ctx.email);
    return NextResponse.json({ secret, otpauthUrl, qrImageUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MFA setup failed" },
      { status: 500 },
    );
  }
}
