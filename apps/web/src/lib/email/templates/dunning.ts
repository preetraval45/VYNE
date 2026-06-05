// PH-E — Dunning email body. Sent when a Stripe invoice fails to
// charge. Three stages keyed off the failure attempt count:
//   - first: "Your card couldn't be charged"
//   - retry: "Card still failing, we'll try again on X"
//   - final: "Account will downgrade on X unless you update your card"

export type DunningStage = "first" | "retry" | "final";

export interface DunningEmailArgs {
  /** Display name; falls back to "there". */
  recipientName?: string;
  /** Which stage of the dunning ladder this is. */
  stage: DunningStage;
  /** Direct link to the Customer Portal so users can update their card
   *  in one click. */
  portalUrl: string;
  /** Optional human-readable next retry / downgrade date for the body. */
  nextDate?: string;
  /** Plan label shown in copy. */
  planLabel?: string;
  /** Currency-formatted amount due, e.g. "$24.00". */
  amountDue?: string;
}

export function renderDunningEmail(args: DunningEmailArgs): {
  subject: string;
  html: string;
} {
  const greeting = args.recipientName
    ? `Hi ${escapeHtml(args.recipientName)},`
    : "Hi there,";
  const plan = args.planLabel ?? "Vyne";

  let subject: string;
  let headline: string;
  let body: string;
  let cta: string;

  switch (args.stage) {
    case "first":
      subject = `We couldn't charge your card`;
      headline = "Your latest payment didn't go through";
      body = `Your card on file was declined when we tried to renew your ${escapeHtml(plan)} subscription${args.amountDue ? ` for ${escapeHtml(args.amountDue)}` : ""}. We'll try again automatically in the next few days, but you can keep things on track by updating your payment method now.`;
      cta = "Update card";
      break;
    case "retry":
      subject = `Card still failing — please update`;
      headline = "Your card is still being declined";
      body = `We've tried to charge your card a couple of times since the last failure. Until the payment goes through, your account stays in a past-due state and some features may be limited.${args.nextDate ? ` We'll try once more on ${escapeHtml(args.nextDate)}.` : ""}`;
      cta = "Fix payment";
      break;
    case "final":
      subject = `Final notice — account will downgrade`;
      headline = "Action required to keep your subscription";
      body = `This is the last attempt before your account is downgraded to the free plan${args.nextDate ? ` on ${escapeHtml(args.nextDate)}` : ""}. You'll keep your data — only the paid features go away. Update your card to keep your subscription active.`;
      cta = "Save my subscription";
      break;
  }

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
              <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#6C47FF;">Vyne</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 4px 32px;">
              <h1 style="margin:0;font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#1C1C2E;">${escapeHtml(headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;font-size:14.5px;line-height:1.55;color:#2E2E3F;">
              <p style="margin:0 0 16px 0;">${greeting}</p>
              <p style="margin:0 0 16px 0;">${body}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 4px 32px;" align="left">
              <a href="${escapeAttr(args.portalUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#6C47FF;color:#FFFFFF;text-decoration:none;font-size:14.5px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(cta)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;font-size:13px;line-height:1.55;color:#5C5C76;border-top:1px solid #E8E8EF;margin-top:24px;">
              <p style="margin:16px 0 0 0;">If you've already fixed your payment method, thanks — please ignore this message.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:12px;color:#9A9AAE;">Sent by Vyne · This is a billing notification.</p>
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
