"use client";

/**
 * Screen-share advanced helpers (28.4).
 *
 *   const stream = await captureScreen({ region: "monitor", audio: true });
 *   const region = await captureRegion(stream, { x: 200, y: 100, w: 800, h: 600 });
 *   const frozen = freezeStream(stream);
 *
 * Wraps `getDisplayMedia` with three things the existing call layer
 * doesn't expose:
 *
 *   28.4.1 — `region: "monitor" | "window" | "browser"` lets the
 *           caller hint which `displaySurface` they want; also the
 *           `captureRegion` helper crops a sub-rectangle of any
 *           captured stream into a new MediaStream (canvas pipeline).
 *   28.4.2 — `audio` toggle includes system / tab audio when the
 *           browser supports it (Chromium-based today; Safari falls
 *           back to video-only).
 *   28.4.9 — `freezeStream(stream)` snapshots the last frame onto a
 *           canvas track so the presenter can flip windows without
 *           leaking their desktop. `unfreezeStream(handle)` restores.
 */

export interface CaptureOpts {
  /** Surface hint passed to `getDisplayMedia`. Default `monitor`. */
  region?: "monitor" | "window" | "browser";
  /** Include system / tab audio. Default false (legacy default). */
  audio?: boolean;
  /** Cap output width when the browser exceeds the requested size. */
  maxWidth?: number;
  /** Cap output framerate. Default 30 fps. */
  maxFps?: number;
}

export interface CaptureResult {
  stream: MediaStream | null;
  /** Browser-reported display surface ("monitor" / "window" / "browser"). */
  surface: string | null;
  /** True when the browser actually delivered an audio track. */
  audioCaptured: boolean;
  errors: string[];
}

/**
 * Acquire a display-media stream. Falls through cleanly when the
 * browser denies / cancels — caller decides what to do.
 */
export async function captureScreen(
  opts: CaptureOpts = {},
): Promise<CaptureResult> {
  const errors: string[] = [];
  if (typeof window === "undefined") {
    return { stream: null, surface: null, audioCaptured: false, errors: ["ssr"] };
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return {
      stream: null,
      surface: null,
      audioCaptured: false,
      errors: ["getDisplayMedia unsupported"],
    };
  }

  const constraints: MediaStreamConstraints & {
    video?: MediaTrackConstraints & { displaySurface?: string };
    audio?: MediaTrackConstraints | boolean;
  } = {
    video: {
      // Hint preferred surface; the browser's own picker still wins.
      displaySurface: opts.region ?? "monitor",
      frameRate: { max: opts.maxFps ?? 30 },
    },
    audio: opts.audio ?? false,
  };
  if (opts.maxWidth) {
    (constraints.video as MediaTrackConstraints).width = { max: opts.maxWidth };
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const videoTrack = stream.getVideoTracks()[0] ?? null;
    let surface: string | null = null;
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      surface = (settings as { displaySurface?: string }).displaySurface ?? null;
    }
    return {
      stream,
      surface,
      audioCaptured: stream.getAudioTracks().length > 0,
      errors,
    };
  } catch (err) {
    return {
      stream: null,
      surface: null,
      audioCaptured: false,
      errors: [err instanceof Error ? err.message : "capture failed"],
    };
  }
}

// ── Region selector ─────────────────────────────────────────────

export interface RegionRect {
  /** All values are pixel offsets from the source video's top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RegionHandle {
  /** Cropped video stream (no audio). Caller publishes this instead. */
  stream: MediaStream;
  /** Cleanup — call before swapping or stopping the share. */
  release: () => void;
}

/**
 * Crop a captured screen stream to a sub-rectangle. Runs entirely in
 * a `<canvas>`; reads frames at `30 fps` and re-publishes via
 * `captureStream()`. The canvas's stream replaces the raw track on
 * the peer connection — no server processing.
 *
 * `null` when the source has no video track or `MediaRecorder`-style
 * pipelines aren't available in the runtime.
 */
export async function captureRegion(
  source: MediaStream,
  region: RegionRect,
): Promise<RegionHandle | null> {
  if (typeof window === "undefined") return null;
  const videoTrack = source.getVideoTracks()[0];
  if (!videoTrack) return null;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([videoTrack]);
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("region preview load failed"));
    video.play().catch(() => {
      /* autoplay may be blocked; the loadedmetadata fires regardless */
    });
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(region.w));
  canvas.height = Math.max(2, Math.round(region.h));
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) return null;

  let raf = 0;
  let stopped = false;
  function tick() {
    if (stopped) return;
    if (video.videoWidth > 0 && ctx) {
      ctx.drawImage(
        video,
        region.x,
        region.y,
        region.w,
        region.h,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
    raf = requestAnimationFrame(tick);
  }
  tick();

  const cropped = (canvas as HTMLCanvasElement & {
    captureStream: (frameRate?: number) => MediaStream;
  }).captureStream(30);

  return {
    stream: cropped,
    release: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      try {
        for (const t of cropped.getTracks()) t.stop();
      } catch {
        // ignore
      }
      try {
        video.srcObject = null;
      } catch {
        // ignore
      }
    },
  };
}

// ── Freeze ──────────────────────────────────────────────────────

export interface FreezeHandle {
  /** Frozen video stream — replaces the live one until released. */
  stream: MediaStream;
  /** Cleanup; restores live publishing. */
  release: () => void;
}

/**
 * Snapshot the current frame of a captured screen stream onto a
 * canvas + return a still video track the caller can publish in
 * place of the live one. Used by the "Pause share" affordance so a
 * presenter can flip windows without leaking their desktop.
 *
 * The original stream stays live in the background — the caller
 * holds the reference. Release the freeze handle to restore live
 * publishing.
 */
export async function freezeStream(
  source: MediaStream,
): Promise<FreezeHandle | null> {
  if (typeof window === "undefined") return null;
  const videoTrack = source.getVideoTracks()[0];
  if (!videoTrack) return null;
  const video = document.createElement("video");
  video.muted = true;
  video.srcObject = new MediaStream([videoTrack]);
  await video.play().catch(() => {
    /* ignore */
  });

  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  // Static stream — captureStream(0) emits one frame and freezes there.
  const stream = (canvas as HTMLCanvasElement & {
    captureStream: (frameRate?: number) => MediaStream;
  }).captureStream(0);

  return {
    stream,
    release: () => {
      try {
        for (const t of stream.getTracks()) t.stop();
      } catch {
        // ignore
      }
      try {
        video.srcObject = null;
      } catch {
        // ignore
      }
    },
  };
}

/** True when the runtime supports system-audio capture (Chromium). */
export function canCaptureSystemAudio(): boolean {
  if (typeof navigator === "undefined") return false;
  // Heuristic: Chrome + Edge expose `audio: true` to getDisplayMedia
  // since 92; Firefox + Safari still don't.
  const ua = navigator.userAgent.toLowerCase();
  return /chrome|edg/.test(ua) && !/mobile/.test(ua);
}
