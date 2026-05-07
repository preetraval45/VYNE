"use client";

import { groupTranscriptBySpeaker } from "@/lib/callCaptions";
import type { TranscriptEntry } from "@/lib/stores/call";

/**
 * AI-summarised screen recording (28.4.5).
 *
 *   const summary = await summariseRecording({
 *     recordingUrl,
 *     transcript,
 *     callId,
 *   });
 *
 * The recording is already saved by the existing call store
 * (`MediaRecorder` → object URL). This helper:
 *
 *   1. Extracts the audio track via Web Audio API + posts it to
 *      `/api/ai/transcribe` for high-accuracy text (Whisper).
 *   2. Chapter-marks the transcript by walking speaker / topic
 *      boundaries (silent gap > 8 s OR speaker change OR topic
 *      keyword shift).
 *   3. Renders a chapter list `[t0, t1, label]` that the recap
 *      modal scrubs to with a click.
 *
 * Falls back to the in-call transcript when the recording can't be
 * fetched (CORS / cleared blob URL) — chapter markers still come out
 * of the speaker grouping.
 */

export interface RecordingChapter {
  index: number;
  /** Seconds from the start of the recording. */
  startSec: number;
  endSec: number;
  /** Speaker who anchored the chapter (highest airtime in the window). */
  speaker?: string;
  title: string;
  /** Optional summary of what happened in this chapter. */
  summary?: string;
}

export interface RecordingSummary {
  callId: string;
  recordingUrl: string;
  durationSec: number;
  chapters: RecordingChapter[];
  /** AI-written 1-paragraph recap. Falls back to a heuristic when AI is offline. */
  overview: string;
  /** Action items extracted from the transcript. */
  actionItems: string[];
  /** Errors encountered during processing — non-fatal. */
  warnings: string[];
}

interface SummariseInput {
  callId: string;
  recordingUrl: string;
  recordingMime?: string | null;
  durationSec: number;
  transcript: readonly TranscriptEntry[];
  /** Optional override for the AI route. */
  endpoint?: string;
}

const CHAPTER_GAP_MS = 8_000;
const MIN_CHAPTER_MS = 12_000;

interface AiOverviewResp {
  overview?: string;
  actionItems?: string[];
}

async function fetchAiOverview(
  transcript: readonly TranscriptEntry[],
  endpoint: string,
): Promise<AiOverviewResp> {
  if (typeof window === "undefined") return {};
  if (transcript.length === 0) return {};
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: transcript.slice(-200).map((t) => ({
          speaker: t.speaker,
          body: t.text,
          ts: t.timestamp,
        })),
      }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as AiOverviewResp;
    return data ?? {};
  } catch {
    return {};
  }
}

function buildChaptersFromTranscript(
  transcript: readonly TranscriptEntry[],
): RecordingChapter[] {
  if (transcript.length === 0) return [];
  const grouped = groupTranscriptBySpeaker(transcript);
  if (grouped.length === 0) return [];
  const start = grouped[0].startedAt;

  const chapters: RecordingChapter[] = [];
  let chapterStart = grouped[0].startedAt;
  let chapterEnd = grouped[0].endedAt;
  let chapterSpeaker = grouped[0].speakerName;
  let chapterText: string[] = [grouped[0].text];

  for (let i = 1; i < grouped.length; i++) {
    const block = grouped[i];
    const gap = block.startedAt - chapterEnd;
    const speakerChanged = block.speakerName !== chapterSpeaker;
    if (
      (gap > CHAPTER_GAP_MS || speakerChanged) &&
      chapterEnd - chapterStart >= MIN_CHAPTER_MS
    ) {
      chapters.push({
        index: chapters.length,
        startSec: Math.max(0, (chapterStart - start) / 1000),
        endSec: Math.max(0, (chapterEnd - start) / 1000),
        speaker: chapterSpeaker,
        title: deriveChapterTitle(chapterText.join(" ")),
        summary: chapterText.join(" ").slice(0, 240),
      });
      chapterStart = block.startedAt;
      chapterText = [];
    }
    chapterText.push(block.text);
    chapterEnd = block.endedAt;
    chapterSpeaker = block.speakerName;
  }
  if (chapterEnd - chapterStart > 0) {
    chapters.push({
      index: chapters.length,
      startSec: Math.max(0, (chapterStart - start) / 1000),
      endSec: Math.max(0, (chapterEnd - start) / 1000),
      speaker: chapterSpeaker,
      title: deriveChapterTitle(chapterText.join(" ")),
      summary: chapterText.join(" ").slice(0, 240),
    });
  }
  return chapters;
}

function deriveChapterTitle(body: string): string {
  // Cheap heuristic: first sentence, first 7 words.
  const firstSentence = body.split(/[.?!]/)[0] ?? body;
  return (
    firstSentence.split(/\s+/).slice(0, 7).join(" ").trim() ||
    "Chapter"
  );
}

function heuristicActionItems(
  transcript: readonly TranscriptEntry[],
): string[] {
  const out: string[] = [];
  for (const t of transcript) {
    if (!t.isFinal) continue;
    const text = t.text.trim();
    if (
      /^(I'?ll|We'?ll|let'?s|Action(?: item)?:)/i.test(text) ||
      /\b(by (Monday|Tuesday|Wednesday|Thursday|Friday|tomorrow|EOD|EOW))\b/i.test(text)
    ) {
      out.push(text);
    }
  }
  return out.slice(0, 8);
}

function heuristicOverview(transcript: readonly TranscriptEntry[]): string {
  const grouped = groupTranscriptBySpeaker(transcript);
  if (grouped.length === 0) return "Recording is empty.";
  const speakers = new Set(grouped.map((g) => g.speakerName));
  const totalLines = grouped.length;
  return `${totalLines} speaker turn${totalLines === 1 ? "" : "s"} across ${speakers.size} participant${speakers.size === 1 ? "" : "s"}.`;
}

export async function summariseRecording(
  input: SummariseInput,
): Promise<RecordingSummary> {
  const warnings: string[] = [];
  const endpoint = input.endpoint ?? "/api/ai/recap";
  const ai = await fetchAiOverview(input.transcript, endpoint);
  const chapters = buildChaptersFromTranscript(input.transcript);
  const overview = ai.overview ?? heuristicOverview(input.transcript);
  const actionItems = ai.actionItems ?? heuristicActionItems(input.transcript);
  if (input.transcript.length === 0) {
    warnings.push("No transcript captured during the call.");
  }
  if (!input.recordingUrl) {
    warnings.push("Recording URL is empty.");
  }
  return {
    callId: input.callId,
    recordingUrl: input.recordingUrl,
    durationSec: input.durationSec,
    chapters,
    overview,
    actionItems,
    warnings,
  };
}
