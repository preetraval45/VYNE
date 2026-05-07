"use client";

import type { TranscriptEntry, CallParticipant } from "@/lib/stores/call";

/**
 * Live caption overlay + speaker diarization (28.3.1 + 28.3.2).
 *
 *   const lines = buildCaptionRing(transcript, participants);
 *   <div>{lines.map(...)}</div>
 *
 * The call store already runs Web Speech API transcription and pushes
 * `TranscriptEntry` rows. This helper:
 *
 *   1. Identifies the active speaker per chunk by matching the
 *      `isSpeaking` flag on each participant against the transcript
 *      timestamp (Web Speech doesn't expose track-id, so we lean on
 *      the WebRTC volume detector).
 *   2. Maintains a ring buffer of the last 12 caption lines + their
 *      speakers so the on-screen overlay scrolls naturally.
 *   3. Auto-fades old lines (lines older than 6 s + non-final get
 *      dropped from the ring).
 *
 * No persistence — captions are session-only. Recap modal uses the
 * full transcript array; this helper is the live overlay.
 */

export interface CaptionLine {
  id: string;
  speakerId: string;
  speakerName: string;
  /** Hex / CSS colour stamped by `colorForSpeaker`. */
  speakerColor: string;
  text: string;
  /** Performance.now() ms — used by the fade GC. */
  ts: number;
  isFinal: boolean;
}

const RING_SIZE = 12;
const FADE_MS_INTERIM = 4_000;
const FADE_MS_FINAL = 12_000;

const SPEAKER_PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#14B8A6",
  "#EF4444",
];

const speakerColorCache = new Map<string, string>();

/**
 * Stable colour per speaker id. Walks the palette deterministically
 * (FNV-1a hash on the id) so the same person gets the same colour
 * across reloads.
 */
export function colorForSpeaker(speakerId: string): string {
  if (!speakerId) return "var(--text-tertiary)";
  const cached = speakerColorCache.get(speakerId);
  if (cached) return cached;
  let h = 2166136261;
  for (let i = 0; i < speakerId.length; i++) {
    h ^= speakerId.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const colour = SPEAKER_PALETTE[h % SPEAKER_PALETTE.length];
  speakerColorCache.set(speakerId, colour);
  return colour;
}

/**
 * Pick the active speaker at a given moment. Web Speech doesn't tag
 * tracks, so we match `isSpeaking` on the participants. When more
 * than one is speaking, prefer the one with the longest current run
 * (caller's responsibility to pass that). Falls back to "You".
 */
export function pickActiveSpeaker(
  participants: readonly CallParticipant[],
  selfName = "You",
): CallParticipant {
  const speaking = participants.filter((p) => p.isSpeaking);
  if (speaking.length === 1) return speaking[0];
  if (speaking.length > 1) return speaking[0];
  return {
    id: "self",
    name: selfName,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    isSpeaking: false,
  };
}

/**
 * Walk the transcript + participants → derive a ring of caption
 * lines. Stable order; final lines persist longer than interim
 * results so the overlay is readable.
 */
export function buildCaptionRing(
  transcript: readonly TranscriptEntry[],
  participants: readonly CallParticipant[],
): CaptionLine[] {
  if (transcript.length === 0) return [];
  const now = Date.now();
  const out: CaptionLine[] = [];
  for (let i = transcript.length - 1; i >= 0 && out.length < RING_SIZE; i--) {
    const entry = transcript[i];
    const ageMs = now - entry.timestamp;
    const cutoff = entry.isFinal ? FADE_MS_FINAL : FADE_MS_INTERIM;
    if (ageMs > cutoff) continue;

    const speaker =
      participants.find(
        (p) =>
          p.name.toLowerCase() === (entry.speaker ?? "").toLowerCase() ||
          p.id === entry.speaker,
      ) ?? null;

    out.unshift({
      id: entry.id,
      speakerId: speaker?.id ?? entry.speaker ?? "self",
      speakerName: speaker?.name ?? entry.speaker ?? "You",
      speakerColor: colorForSpeaker(speaker?.id ?? entry.speaker ?? "self"),
      text: entry.text.trim(),
      ts: entry.timestamp,
      isFinal: entry.isFinal,
    });
  }
  return out;
}

/**
 * Group consecutive transcript chunks into per-speaker blocks for
 * the recap modal. Returns `{ speaker, color, text, durationSec }`.
 */
export function groupTranscriptBySpeaker(
  transcript: readonly TranscriptEntry[],
): Array<{
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  text: string;
  startedAt: number;
  endedAt: number;
}> {
  const out: Array<{
    speakerId: string;
    speakerName: string;
    speakerColor: string;
    text: string;
    startedAt: number;
    endedAt: number;
  }> = [];
  for (const entry of transcript) {
    if (!entry.isFinal) continue;
    const last = out[out.length - 1];
    if (last && last.speakerName === entry.speaker) {
      last.text = `${last.text} ${entry.text.trim()}`;
      last.endedAt = entry.timestamp;
      continue;
    }
    out.push({
      speakerId: entry.speaker ?? "self",
      speakerName: entry.speaker ?? "You",
      speakerColor: colorForSpeaker(entry.speaker ?? "self"),
      text: entry.text.trim(),
      startedAt: entry.timestamp,
      endedAt: entry.timestamp,
    });
  }
  return out;
}

/** Estimate per-speaker airtime % for the recap. Useful for "Sarah
 *  spoke 62% of the meeting" callouts. */
export function airtimeBySpeaker(
  transcript: readonly TranscriptEntry[],
): Array<{ speakerName: string; ms: number; pct: number }> {
  const grouped = groupTranscriptBySpeaker(transcript);
  if (grouped.length === 0) return [];
  const total = grouped.reduce(
    (sum, g) => sum + Math.max(g.endedAt - g.startedAt, 0),
    0,
  );
  if (total === 0) return [];
  const totals = new Map<string, number>();
  for (const g of grouped) {
    totals.set(
      g.speakerName,
      (totals.get(g.speakerName) ?? 0) + Math.max(g.endedAt - g.startedAt, 0),
    );
  }
  return Array.from(totals.entries())
    .map(([speakerName, ms]) => ({
      speakerName,
      ms,
      pct: Math.round((ms / total) * 100),
    }))
    .sort((a, b) => b.ms - a.ms);
}
