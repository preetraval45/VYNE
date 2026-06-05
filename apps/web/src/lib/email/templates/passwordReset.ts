// PH-D — Password-reset email body. Inline-styled so it renders the
// same across Gmail / Outlook / Apple Mail without their CSS-stripping
// changing the look. No JS, no external assets — accessible offline.

export interface PasswordResetEmailArgs {
  /** Display name, e.g. "Preet". */
  recipientName?: string;
  /** Full reset URL including ?token=... */
  resetUrl: string;
  /** Window in human-readable form ("1 hour"). */
  expiresIn?: string;
  /** Marketing brand block — defaults to "Vyne". */
  brand?: string;
}

export function renderPasswordResetEmail(args: PasswordResetEmailArgs): {
  subject: string;
  html: string;
} {
  const brand = args.brand ?? "Vyne";
  const greeting = args.recipientName
    ? `Hi ${escapeHtml(args.recipientName)},`
    : "Hi,";
  const expires = args.expiresIn ?? "1 hour";

  const subject = `Reset your ${brand} password`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C1C2E;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F4F8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px -16px rgba(15,23,42,0.16);">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#6C47FF;">${escapeHtml(brand)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 4px 32px;">
              <h1 style="margin:0;font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#1C1C2E;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;font-size:14.5px;line-height:1.55;color:#2E2E3F;">
              <p style="margin:0 0 16px 0;">${greeting}</p>
              <p style="margin:0 0 16px 0;">We received a request to reset your password. Use the button below to choose a new one — the link is good for the next <strong>${escapeHtml(expires)}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 4px 32px;" align="left">
              <a href="${escapeAttr(args.resetUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#6C47FF;color:#FFFFFF;text-decoration:none;font-size:14.5px;font-weight:600;letter-spacing:-0.01em;">Reset password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;font-size:13px;line-height:1.55;color:#5C5C76;">
              <p style="margin:0 0 12px 0;">Or copy this URL into your browser:</p>
              <p style="margin:0;word-break:break-all;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12px;color:#1C1C2E;">${escapeHtml(args.resetUrl)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;font-size:13px;line-height:1.55;color:#5C5C76;border-top:1px solid #E8E8EF;margin-top:24px;">
              <p style="margin:16px 0 0 0;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:12px;color:#9A9AAE;">Sent by ${escapeHtml(brand)} · This is a security notification.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function escapeAttr(s: string): string {
  return s.replace(/["<>&]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}
