"use client";

import { providerConfigured } from "@/lib/oauthProviders";

/**
 * Calendar integration for scheduled calls (28.3.7).
 *
 *   const result = await createCalendarEvent({
 *     title: "Pricing review",
 *     startsAt: "2026-05-15T15:00:00Z",
 *     durationMin: 30,
 *     attendeeEmails: ["sarah@acme.com", "tony@acme.com"],
 *     callUrl: "https://vyne.app/call/abc",
 *   });
 *
 * Routes to whichever calendar provider is configured (Google first,
 * then Microsoft). Falls back to an `.ics` blob the caller can
 * `<a download>` so a meeting invite still works without OAuth.
 *
 * Phase 21.6 already ships the OAuth marketplace + token exchange;
 * this helper is the call-time integration point.
 */

export interface CreateEventInput {
  title: string;
  /** ISO timestamp. */
  startsAt: string;
  durationMin: number;
  attendeeEmails: string[];
  /** VYNE call URL — pasted into the description so attendees can join. */
  callUrl: string;
  /** Optional dial-in number + PIN from the PSTN bridge. */
  dialIn?: { phone: string; pin: string };
  /** Optional meeting agenda. */
  agenda?: string;
  /** Optional location (in-person or hybrid). */
  location?: string;
}

export interface CalendarResult {
  ok: boolean;
  /** Provider id when posted to a real calendar. */
  provider?: "google" | "microsoft" | "ics";
  /** Provider event id for later updates / deletions. */
  externalId?: string;
  /** When provider === "ics", a data URL the caller can download. */
  icsDataUrl?: string;
  /** Public link (if the provider exposes one — e.g. Google calendar event URL). */
  htmlLink?: string;
  error?: string;
}

function fmtIcsDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function buildIcs(input: CreateEventInput): string {
  const start = fmtIcsDate(input.startsAt);
  const end = fmtIcsDate(
    new Date(
      new Date(input.startsAt).getTime() + input.durationMin * 60_000,
    ).toISOString(),
  );
  const description = [
    input.agenda?.trim() ?? "",
    `Join: ${input.callUrl}`,
    input.dialIn ? `Dial-in: ${input.dialIn.phone} · PIN ${input.dialIn.pin}` : "",
  ]
    .filter((s): s is string => s.length > 0)
    .map((s) => escapeIcs(s))
    .join("\\n\\n");
  const attendees = input.attendeeEmails
    .map(
      (email) =>
        `ATTENDEE;CN=${escapeIcs(email)};RSVP=TRUE:mailto:${email}`,
    )
    .join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VYNE//Calls//EN",
    "BEGIN:VEVENT",
    `UID:${start}-${Math.random().toString(36).slice(2, 9)}@vyne.app`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${description}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : "",
    `URL:${input.callUrl}`,
    attendees,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function buildIcsDataUrl(ics: string): string {
  if (typeof window === "undefined") return "";
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  return URL.createObjectURL(blob);
}

/** Build a webcal "Add to Google Calendar" deep-link. Works without
 *  OAuth — opens Google's compose page pre-filled. */
export function buildGoogleAddUrl(input: CreateEventInput): string {
  const start = fmtIcsDate(input.startsAt);
  const end = fmtIcsDate(
    new Date(
      new Date(input.startsAt).getTime() + input.durationMin * 60_000,
    ).toISOString(),
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
    details: [
      input.agenda ?? "",
      `Join: ${input.callUrl}`,
      input.dialIn
        ? `Dial-in: ${input.dialIn.phone} · PIN ${input.dialIn.pin}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    add: input.attendeeEmails.join(","),
    location: input.location ?? input.callUrl,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function createCalendarEvent(
  input: CreateEventInput,
): Promise<CalendarResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "ssr" };
  }
  // Prefer Google when configured.
  if (providerConfigured("google")) {
    try {
      const res = await fetch("/api/integrations/calendar/google/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          externalId?: string;
          htmlLink?: string;
        };
        return {
          ok: true,
          provider: "google",
          externalId: data.externalId,
          htmlLink: data.htmlLink,
        };
      }
    } catch {
      // fall through to other providers
    }
  }
  if (providerConfigured("microsoft")) {
    try {
      const res = await fetch(
        "/api/integrations/calendar/microsoft/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          externalId?: string;
          htmlLink?: string;
        };
        return {
          ok: true,
          provider: "microsoft",
          externalId: data.externalId,
          htmlLink: data.htmlLink,
        };
      }
    } catch {
      // fall through
    }
  }
  // Fallback — return a downloadable .ics blob.
  const ics = buildIcs(input);
  const url = buildIcsDataUrl(ics);
  return {
    ok: true,
    provider: "ics",
    icsDataUrl: url,
  };
}
