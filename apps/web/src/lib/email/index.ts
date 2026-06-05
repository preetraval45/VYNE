// PH-D — Email send helper.
//
// Uses Resend in production (free tier: 100 emails/day, 3k/month). When
// RESEND_API_KEY is unset (local dev, demo preview, staging without an
// inbox), falls back to `console.info` so the body / link are still
// visible for testing. Replace with SES later if vendor independence
// matters — same public API, swap the implementation.

import { Resend } from "resend";

export interface SendEmailArgs {
  /** Recipient address. */
  to: string;
  /** Subject line. Avoid trailing whitespace / leading "RE:" — those
   *  tank Gmail-style threading. */
  subject: string;
  /** Pre-rendered HTML body. Plain-text fallback derived automatically. */
  html: string;
  /** Optional override; defaults to FROM env or no-reply@vyne.app. */
  from?: string;
  /** Optional Reply-To header (Resend strips this when undefined). */
  replyTo?: string;
  /** Logical tag for routing / quota / analytics ("password-reset",
   *  "billing-dunning", etc.). Maps to Resend's `tags` parameter. */
  category?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  /** True when the email was logged to console rather than sent —
   *  callers (tests / demo) can assert this to detect the dev path. */
  deliveredViaConsole?: boolean;
}

const FROM_DEFAULT =
  process.env.RESEND_FROM_EMAIL ?? "Vyne <no-reply@vyne.app>";

let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cachedClient = new Resend(key);
  return cachedClient;
}

/** Strip HTML tags + collapse whitespace to make a passable plain-text
 *  fallback. Resend prefers an explicit `text` payload — without it,
 *  some clients render the HTML as a single uncollapsed string. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    // eslint-disable-next-line no-console
    console.info(
      `[email] (no provider — logging only) → ${args.to}\nSubject: ${args.subject}\n\n${htmlToText(args.html)}`,
    );
    return { ok: true, deliveredViaConsole: true };
  }

  try {
    const res = await client.emails.send({
      from: args.from ?? FROM_DEFAULT,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: htmlToText(args.html),
      replyTo: args.replyTo,
      tags: args.category
        ? [{ name: "category", value: args.category }]
        : undefined,
    });
    if (res.error) {
      return { ok: false, error: res.error.message };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown send error",
    };
  }
}
