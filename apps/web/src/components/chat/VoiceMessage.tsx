"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface VoiceMessageProps {
  readonly url: string;
  readonly filename: string;
  readonly sizeBytes: number;
}

/**
 * WhatsApp-style voice message player. No backend required — generates a
 * deterministic faux-waveform from the filename hash so each message has
 * its own visual identity. As the audio plays, played bars light up
 * (purple/teal) and unplayed stay neutral. Click any bar to seek.
 */
export function VoiceMessage({ url, filename, sizeBytes }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1

  // 32 bars, deterministic heights from filename hash
  const bars = useMemo(() => {
    let h = 0;
    for (let i = 0; i < filename.length; i++) {
      h = (h * 31 + filename.charCodeAt(i)) | 0;
    }
    const out: number[] = [];
    let seed = Math.abs(h) || 1;
    for (let i = 0; i < 32; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      // Bell-ish curve so it looks like a voice (peaks middle)
      const center = 16;
      const dist = Math.abs(i - center) / 16;
      const envelope = 1 - dist * 0.5;
      const amp = ((seed / 233280) * 0.7 + 0.3) * envelope;
      out.push(Math.max(0.18, amp));
    }
    return out;
  }, [filename]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration > 0) {
        setProgress(a.currentTime / a.duration);
      }
    };
    const onLoaded = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      a.currentTime = 0;
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play();
      setPlaying(true);
    }
  }

  function seekToBar(idx: number) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (idx / 32) * duration;
    a.currentTime = t;
    setProgress(t / duration);
  }

  function fmt(s: number): string {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  const playedIdx = Math.floor(progress * 32);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        borderRadius: 18,
        background:
          "linear-gradient(135deg, rgba(108, 71, 255, 0.12), rgba(6, 182, 212, 0.08))",
        border: "1px solid rgba(108, 71, 255, 0.25)",
        maxWidth: 360,
        marginTop: 4,
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" aria-label="Voice message" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background:
            "linear-gradient(135deg, var(--vyne-purple), #06B6D4)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(108, 71, 255, 0.3)",
        }}
      >
        {playing ? <Pause size={14} fill="#fff" /> : <Play size={14} fill="#fff" />}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        {bars.map((amp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => seekToBar(i)}
            aria-label={`Seek to ${Math.round((i / 32) * 100)}%`}
            style={{
              width: 3,
              height: `${Math.max(4, Math.round(amp * 22))}px`,
              borderRadius: 2,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background:
                i <= playedIdx
                  ? "var(--vyne-purple)"
                  : "rgba(255, 255, 255, 0.25)",
              transition: "background 0.1s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        <Mic size={11} style={{ color: "var(--vyne-purple)" }} />
        <span>
          {duration
            ? fmt(progress * duration) + " / " + fmt(duration)
            : `${(sizeBytes / 1024).toFixed(0)} KB`}
        </span>
      </div>
    </div>
  );
}
