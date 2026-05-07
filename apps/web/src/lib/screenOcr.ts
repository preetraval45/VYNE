"use client";

/**
 * Click-to-copy OCR + accessibility captions for screen content
 * (28.4.7 + 28.4.8).
 *
 *   const text = await ocrAtPoint(video, { x, y, radius });
 *   const boxes = await ocrFrame(video);
 *
 * Tesseract.js is loaded on demand from CDN — never bundled, so the
 * call panel stays slim. The first call kicks off worker init (~3 s
 * cold start); subsequent calls reuse the same worker.
 *
 * `ocrFrame()` returns every recognised text box with pixel
 * coordinates so:
 *
 *   28.4.7  — the call panel can hover/click any text → copy.
 *   28.4.8  — a screen-reader live region announces the text the
 *             presenter is currently pointing at (paired with the
 *             cursor highlight from 28.4.3).
 *
 * Falls back to a no-op (returns `[]`) when Tesseract isn't reachable
 * — caller renders a "OCR unavailable" hint in that case.
 */

interface TesseractWorker {
  recognize(image: HTMLCanvasElement | HTMLImageElement): Promise<{
    data: {
      words?: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
      text?: string;
    };
  }>;
  terminate(): Promise<void>;
}

interface TesseractModule {
  createWorker(opts?: { logger?: (m: unknown) => void }): Promise<TesseractWorker>;
}

let _workerPromise: Promise<TesseractWorker | null> | null = null;
const TESSERACT_CDN =
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js";

async function loadTesseract(): Promise<TesseractModule | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Tesseract?: TesseractModule };
  if (w.Tesseract) return w.Tesseract;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => resolve(w.Tesseract ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

async function getWorker(): Promise<TesseractWorker | null> {
  if (_workerPromise) return _workerPromise;
  _workerPromise = (async () => {
    const tess = await loadTesseract();
    if (!tess) return null;
    try {
      return await tess.createWorker();
    } catch {
      return null;
    }
  })();
  return _workerPromise;
}

export interface OcrWord {
  text: string;
  confidence: number;
  /** Pixel coordinates relative to the source video / canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Snapshot a video frame onto a canvas at native resolution. */
function snapshotVideo(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * OCR the entire current frame of a `<video>` element. Returns
 * `OcrWord[]` (text + bounding box) so the caller can:
 *
 *   - Render copy buttons over each word.
 *   - Run `scanForSecrets` from `smartRedaction` to know which
 *     boxes need black rectangles before share.
 */
export async function ocrFrame(
  video: HTMLVideoElement,
): Promise<OcrWord[]> {
  if (typeof window === "undefined") return [];
  const worker = await getWorker();
  if (!worker) return [];
  const canvas = snapshotVideo(video);
  if (!canvas) return [];
  try {
    const result = await worker.recognize(canvas);
    return (result.data.words ?? [])
      .filter((w) => w.text.trim().length > 0 && w.confidence > 50)
      .map((w) => ({
        text: w.text,
        confidence: w.confidence,
        x: w.bbox.x0,
        y: w.bbox.y0,
        w: w.bbox.x1 - w.bbox.x0,
        h: w.bbox.y1 - w.bbox.y0,
      }));
  } catch {
    return [];
  }
}

/**
 * Find the OCR word at a given pixel coordinate (for click-to-copy).
 * `radius` widens the hit-test so a clumsy click near a word still
 * resolves.
 */
export async function ocrAtPoint(
  video: HTMLVideoElement,
  point: { x: number; y: number; radius?: number },
): Promise<OcrWord | null> {
  const words = await ocrFrame(video);
  const r = point.radius ?? 12;
  let best: OcrWord | null = null;
  let bestDist = Infinity;
  for (const w of words) {
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    if (Math.abs(point.x - cx) <= w.w / 2 + r && Math.abs(point.y - cy) <= w.h / 2 + r) {
      const d = (point.x - cx) ** 2 + (point.y - cy) ** 2;
      if (d < bestDist) {
        best = w;
        bestDist = d;
      }
    }
  }
  return best;
}

/**
 * Accessibility captions for screen content (28.4.8). Picks the word
 * closest to the active cursor position + announces it via the
 * existing `<Announcer />` (Phase 19.3). Throttled so a moving cursor
 * doesn't spam the live region.
 */
export interface AccessibilityCaptionOpts {
  /** Pixel coordinate the presenter's cursor currently points at. */
  cursor: { x: number; y: number };
  /** Throttle window in ms. Default 700. */
  throttleMs?: number;
}

let _lastAnnounce = 0;
let _lastWord = "";

export async function announceWordAtCursor(
  video: HTMLVideoElement,
  opts: AccessibilityCaptionOpts,
): Promise<void> {
  const throttle = opts.throttleMs ?? 700;
  const now = performance.now();
  if (now - _lastAnnounce < throttle) return;
  _lastAnnounce = now;
  const word = await ocrAtPoint(video, {
    x: opts.cursor.x,
    y: opts.cursor.y,
    radius: 16,
  });
  if (!word) return;
  if (word.text === _lastWord) return;
  _lastWord = word.text;
  // Use the global announcer (Phase 19.3) so screen-reader users
  // hear what the presenter is pointing at.
  const announceMod = await import("@/components/layout/Announcer").catch(
    () => null,
  );
  announceMod?.announce(`Pointing at: ${word.text}`, "polite");
}

/** Cleanup the worker — useful when the call panel unmounts. */
export async function teardownOcr(): Promise<void> {
  if (!_workerPromise) return;
  const worker = await _workerPromise;
  _workerPromise = null;
  _lastWord = "";
  _lastAnnounce = 0;
  if (worker) {
    try {
      await worker.terminate();
    } catch {
      // ignore
    }
  }
}
