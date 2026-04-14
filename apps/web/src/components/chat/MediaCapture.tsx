"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MonitorUp, Square, Pause, Play } from "lucide-react";

export type CapturedMedia = {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
  kind: "audio" | "video";
};

interface Props {
  kind: "audio" | "video";
  onComplete: (media: CapturedMedia) => void;
  onCancel?: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function MediaCaptureRecorder({ kind, onComplete, onCancel }: Props) {
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "paused" | "stopped" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState("requesting");
    try {
      const stream =
        kind === "audio"
          ? await navigator.mediaDevices.getUserMedia({ audio: true })
          : await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });

      streamRef.current = stream;

      // Audio level meter
      try {
        const AudioCtx =
          globalThis.AudioContext ??
          (globalThis as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) {
            const n = (v - 128) / 128;
            sum += n * n;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(rms * 2.5, 1));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Level meter optional; continue without it.
      }

      const mimeType =
        kind === "audio"
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAtRef.current;
        onComplete({ blob, url, durationMs, mimeType: recorder.mimeType, kind });
      };

      // If the user stops sharing screen from the browser UI, end the recording gracefully.
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => recorder.state === "recording" && recorder.stop();
      });

      recorder.start(250);
      startedAtRef.current = Date.now();
      setState("recording");
      setElapsed(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access device");
      setState("error");
    }
  }, [kind, onComplete]);

  // Elapsed timer tick
  useEffect(() => {
    if (state !== "recording") return;
    const iv = setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 250);
    return () => clearInterval(iv);
  }, [state]);

  // Auto-start on mount
  useEffect(() => {
    void start();
    return () => {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pauseOrResume() {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state === "recording") {
      r.pause();
      pausedAtRef.current = Date.now();
      setState("paused");
    } else if (r.state === "paused") {
      r.resume();
      if (pausedAtRef.current) {
        startedAtRef.current += Date.now() - pausedAtRef.current;
      }
      pausedAtRef.current = null;
      setState("recording");
    }
  }

  function finish() {
    stop();
    setState("stopped");
  }

  function cancel() {
    stop();
    chunksRef.current = [];
    onCancel?.();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: state === "recording" ? "#EF4444" : "var(--text-tertiary)",
          boxShadow:
            state === "recording" ? "0 0 0 3px rgba(239,68,68,0.25)" : "none",
          animation:
            state === "recording" ? "vyne-pulse 1.2s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      <style>{`
        @keyframes vyne-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--status-danger)",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          minWidth: 44,
        }}
      >
        {fmtTime(elapsed)}
      </span>

      {/* Level meter */}
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(level * 100)}%`,
            background: kind === "audio" ? "var(--status-danger)" : "var(--vyne-purple)",
            transition: "width 80ms linear",
          }}
        />
      </div>

      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        {state === "requesting"
          ? `Requesting ${kind === "audio" ? "microphone" : "screen"}…`
          : state === "paused"
            ? "Paused"
            : kind === "audio"
              ? "Recording voice"
              : "Recording screen"}
      </span>

      {state === "error" && (
        <span style={{ fontSize: 11, color: "var(--status-danger)" }}>{error}</span>
      )}

      <button
        type="button"
        aria-label={state === "paused" ? "Resume" : "Pause"}
        onClick={pauseOrResume}
        disabled={state !== "recording" && state !== "paused"}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state === "paused" ? <Play size={12} /> : <Pause size={12} />}
      </button>

      <button
        type="button"
        aria-label="Stop and attach"
        onClick={finish}
        disabled={state !== "recording" && state !== "paused"}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "none",
          background: "var(--status-danger)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Square size={11} fill="currentColor" />
        Stop
      </button>

      <button
        type="button"
        aria-label="Cancel recording"
        onClick={cancel}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--content-border)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

// Small icon-only launcher buttons the composer can render.
export function RecordLaunchers({
  onStart,
}: {
  onStart: (kind: "audio" | "video") => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Record voice note"
        onClick={() => onStart("audio")}
        style={{
          width: 30,
          height: 30,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <Mic size={15} />
      </button>
      <button
        type="button"
        aria-label="Record screen"
        onClick={() => onStart("video")}
        style={{
          width: 30,
          height: 30,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <MonitorUp size={15} />
      </button>
    </>
  );
}
