"use client";

/**
 * Mobile-native capability helpers (Phase 25).
 *
 * Each function is a thin wrapper around a browser API + a feature
 * detection so callers don't have to repeat the same `if (typeof
 * navigator !== "undefined" && "share" in navigator)` boilerplate.
 *
 *   25.1 captureCamera       — file picker w/ `capture="environment"` for receipts / QR / barcodes
 *   25.2 readGeolocation     — single-shot lat/lng with timeout + retry
 *   25.5 haptic              — vibrate / short / medium / long patterns
 *   25.6 startVoiceInput     — Web Speech API → live transcription
 *   25.7 nativeShare         — navigator.share() with text fallback to clipboard
 */

// ── 25.1 Camera capture ───────────────────────────────────────────

export interface CameraCaptureOpts {
  /** "user" = front camera, "environment" = rear. Default rear. */
  facing?: "user" | "environment";
  /** Accept attribute. Default "image/*". */
  accept?: string;
  /** Allow multi-select (rear camera only). Default false. */
  multiple?: boolean;
}

/**
 * Open the device camera through a hidden `<input>` element. Returns
 * the chosen file(s) when the user accepts, null when the picker is
 * dismissed. Works on every modern mobile browser without an SDK.
 */
export function captureCamera(opts: CameraCaptureOpts = {}): Promise<File[] | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = opts.accept ?? "image/*";
    input.capture = opts.facing ?? "environment";
    input.multiple = Boolean(opts.multiple);
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.addEventListener("change", () => {
      const files = input.files ? Array.from(input.files) : [];
      input.remove();
      resolve(files.length > 0 ? files : null);
    });
    input.addEventListener(
      "cancel",
      () => {
        input.remove();
        resolve(null);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}

// ── 25.2 Geolocation ──────────────────────────────────────────────

export interface GeoReading {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  ts: string;
}

export function readGeolocation(
  opts: PositionOptions = { timeout: 8_000, maximumAge: 60_000, enableHighAccuracy: true },
): Promise<GeoReading | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("geolocation" in navigator)
  ) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          ts: new Date(pos.timestamp).toISOString(),
        }),
      () => resolve(null),
      opts,
    );
  });
}

// ── 25.5 Haptic feedback ──────────────────────────────────────────

export type HapticPattern = "tap" | "short" | "medium" | "long" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  short: 16,
  medium: 32,
  long: 80,
  success: [10, 60, 10],
  error: [60, 30, 60],
};

/**
 * Fire a haptic pattern. No-op when the browser doesn't support
 * `navigator.vibrate` (desktop / iOS Safari). Pair with swipe / pull-
 * to-refresh / long-press for tactile feedback that mirrors native.
 */
export function haptic(pattern: HapticPattern = "tap"): boolean {
  if (
    typeof navigator === "undefined" ||
    !("vibrate" in navigator) ||
    typeof navigator.vibrate !== "function"
  ) {
    return false;
  }
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}

// ── 25.6 Voice input ──────────────────────────────────────────────

interface SpeechResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

interface SpeechRecognitionLike extends EventTarget {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
}

interface VoiceInputHandle {
  /** Unsubscribe and stop listening. */
  stop: () => void;
}

/**
 * Begin listening for voice input. Calls `onResult` with interim +
 * final transcripts as the user speaks; `onError` on permission
 * denial / network issues. Pass `lang` (BCP-47) to override the
 * default user-locale.
 *
 * Returns null when the browser doesn't expose `webkitSpeechRecognition`
 * (Firefox, older Safari).
 */
export function startVoiceInput(
  onResult: (r: SpeechResult) => void,
  opts: { lang?: string; onError?: (msg: string) => void } = {},
): VoiceInputHandle | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  rec.interimResults = true;
  rec.continuous = true;
  rec.addEventListener("result", (event) => {
    const e = event as unknown as {
      resultIndex: number;
      results: ArrayLike<{
        0: { transcript: string; confidence: number };
        isFinal: boolean;
      }>;
    };
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      onResult({
        transcript: r[0].transcript,
        isFinal: r.isFinal,
        confidence: r[0].confidence,
      });
    }
  });
  rec.addEventListener("error", (event) => {
    const e = event as unknown as { error?: string };
    opts.onError?.(e.error ?? "speech error");
  });
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    },
  };
}

// ── 25.7 Native share ─────────────────────────────────────────────

export interface ShareOpts {
  title?: string;
  text?: string;
  url?: string;
  /** Optional file blobs (when supported). */
  files?: File[];
}

/**
 * Surface the native share-sheet via `navigator.share`. Falls back
 * to copying the URL to the clipboard so a "Share" button never
 * 404s on desktop.
 *
 * Returns:
 *   "shared"  → native sheet completed
 *   "copied"  → fell back to clipboard
 *   "failed"  → user cancelled / both paths failed
 */
export async function nativeShare(opts: ShareOpts): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.share === "function") {
    try {
      // canShare for files (Android Chrome). Fall through if it
      // throws — passing files is best-effort.
      const payload: ShareOpts & { files?: File[] } = { ...opts };
      if (payload.files && "canShare" in navigator) {
        const can = (navigator as unknown as { canShare: (d: ShareOpts) => boolean }).canShare(
          payload,
        );
        if (!can) delete payload.files;
      }
      await navigator.share(payload);
      return "shared";
    } catch {
      // Cancelled or unsupported — fall through to clipboard.
    }
  }
  const text =
    [opts.title, opts.text, opts.url].filter(Boolean).join(" · ") || opts.url || "";
  if (
    typeof navigator !== "undefined" &&
    "clipboard" in navigator &&
    typeof navigator.clipboard?.writeText === "function" &&
    text
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // ignore
    }
  }
  return "failed";
}

/** Detect whether the platform exposes a native share sheet. */
export function canNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof navigator.share === "function"
  );
}
