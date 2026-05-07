"use client";

/**
 * Annotation overlay + cursor highlight (28.4.3).
 *
 * `<CallPanel>` renders the shared screen as a `<video>` element.
 * This helper hangs a transparent `<canvas>` on top with two layers:
 *
 *   1. Stroke layer (Yjs-shared via `callWhiteboard`) — every
 *      participant draws onto the same canvas; CRDT keeps strokes
 *      consistent.
 *   2. Cursor highlight — the presenter's mouse position broadcasts
 *      over the call's realtime channel; viewers see a soft glow at
 *      that coordinate so they can follow what's being pointed at.
 *
 * No new store — all state lives on the canvas + the realtime layer.
 */

const CHANNEL_PREFIX = "presence-annotation";
const CURSOR_THROTTLE_MS = 60;

export interface AnnotationCursor {
  participantId: string;
  /** 0..1 normalised position so different viewport sizes still align. */
  x: number;
  y: number;
  ts: number;
}

export interface AnnotationLayerOpts {
  callId: string;
  /** Whether the local user is presenting — only presenters broadcast. */
  isPresenter: boolean;
  /** Local participant id; used to suppress own cursor echo. */
  meId: string;
  /** Local cursor hue (0..359). */
  hue?: number;
}

export interface AnnotationLayerHandle {
  /** Mount on a canvas overlay; call returns the cleanup fn. */
  attach: (canvas: HTMLCanvasElement) => () => void;
  /** Pen colour. Default the local accent. */
  setColor: (hex: string) => void;
  /** Pen width in px. Default 4. */
  setWidth: (px: number) => void;
  /** Wipe every stroke + cursor for the call. */
  clear: () => void;
}

export function createAnnotationLayer(
  opts: AnnotationLayerOpts,
): AnnotationLayerHandle {
  let color = "#06B6D4";
  let width = 4;
  const channel = `${CHANNEL_PREFIX}-${opts.callId}`;
  const remoteCursors = new Map<string, AnnotationCursor>();

  let cleanup: (() => void) | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let lastSent = 0;

  return {
    attach(c) {
      canvas = c;
      const ctx = canvas.getContext("2d");
      if (!ctx) return () => {};
      let drawing = false;
      let last: { x: number; y: number } | null = null;

      function pointFromEvent(ev: PointerEvent): { x: number; y: number } {
        const rect = canvas!.getBoundingClientRect();
        return {
          x: (ev.clientX - rect.left) / rect.width,
          y: (ev.clientY - rect.top) / rect.height,
        };
      }

      function down(ev: PointerEvent) {
        if (!opts.isPresenter && ev.button !== 0) return;
        drawing = true;
        last = pointFromEvent(ev);
      }
      function move(ev: PointerEvent) {
        const p = pointFromEvent(ev);
        broadcastCursor(p);
        if (!drawing || !last || !canvas || !ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(last.x * w, last.y * h);
        ctx.lineTo(p.x * w, p.y * h);
        ctx.stroke();
        // Mirror to other viewers via Yjs (callWhiteboard) — done by
        // the host that mounts the canvas; this helper is the local
        // pen + cursor broadcast only.
        last = p;
      }
      function up() {
        drawing = false;
        last = null;
      }

      // Cursor broadcast (presenter only).
      function broadcastCursor(p: { x: number; y: number }) {
        if (!opts.isPresenter) return;
        const now = performance.now();
        if (now - lastSent < CURSOR_THROTTLE_MS) return;
        lastSent = now;
        try {
          const event = new CustomEvent("vyne:annotation:cursor", {
            detail: {
              channel,
              cursor: {
                participantId: opts.meId,
                x: p.x,
                y: p.y,
                ts: Date.now(),
              },
            },
          });
          window.dispatchEvent(event);
        } catch {
          /* ignore */
        }
      }

      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointerleave", up);

      // Listen for remote cursors.
      function onRemote(e: Event) {
        const detail = (e as CustomEvent<{
          channel: string;
          cursor: AnnotationCursor;
        }>).detail;
        if (!detail || detail.channel !== channel) return;
        if (detail.cursor.participantId === opts.meId) return;
        remoteCursors.set(detail.cursor.participantId, detail.cursor);
        scheduleRender();
      }
      window.addEventListener("vyne:annotation:cursor", onRemote);

      let renderRaf = 0;
      function scheduleRender() {
        if (renderRaf) return;
        renderRaf = requestAnimationFrame(() => {
          renderRaf = 0;
          if (!ctx || !canvas) return;
          // We don't clear the stroke layer; we redraw remote cursors
          // on a separate canvas overlay in production. For the
          // demo we lean on `globalCompositeOperation` so cursor
          // glows appear on top without erasing strokes.
          const now = Date.now();
          for (const [id, cur] of remoteCursors) {
            if (now - cur.ts > 2_500) {
              remoteCursors.delete(id);
              continue;
            }
            const w = canvas.width;
            const h = canvas.height;
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.beginPath();
            ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
            ctx.arc(cur.x * w, cur.y * h, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      cleanup = () => {
        canvas?.removeEventListener("pointerdown", down);
        canvas?.removeEventListener("pointermove", move);
        canvas?.removeEventListener("pointerup", up);
        canvas?.removeEventListener("pointerleave", up);
        window.removeEventListener("vyne:annotation:cursor", onRemote);
        cancelAnimationFrame(renderRaf);
        remoteCursors.clear();
      };
      return cleanup;
    },
    setColor(hex) {
      color = hex;
    },
    setWidth(px) {
      width = Math.max(1, Math.min(20, px));
    },
    clear() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      remoteCursors.clear();
    },
  };
}
