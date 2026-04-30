"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface Props {
  onTranscript: (text: string, final: boolean) => void;
  disabled?: boolean;
}

/**
 * Browser-native voice input via the Web Speech API. No backend needed.
 * Streams interim transcripts to onTranscript so the UI can show live
 * partial results, with `final=true` on the last delivery.
 *
 * Falls back to "unsupported" message in browsers without the API
 * (Firefox today). Chrome / Edge / Safari work.
 */
export function VoiceInputButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (
        window as unknown as {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  function start() {
    if (typeof window === "undefined") return;
    const SR =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;
    if (!SR) return;
    type RecognitionEvent = {
      resultIndex: number;
      results: ArrayLike<{
        isFinal: boolean;
        0: { transcript: string };
      }>;
    };
    interface Recognition {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (e: RecognitionEvent) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    }
    const rec = new (SR as new () => Recognition)();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let buffer = "";
    rec.onresult = (e: RecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        buffer += final;
        onTranscript(buffer.trim(), true);
      } else {
        onTranscript((buffer + interim).trim(), false);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  function stop() {
    const rec = recRef.current as { stop?: () => void } | null;
    rec?.stop?.();
    setListening(false);
  }

  if (supported === false) return null;
  return (
    <button
      type="button"
      className="tap-44"
      onClick={listening ? stop : start}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={listening ? "Stop dictation" : "Voice input"}
      style={{
        // Bumped from 36 to 40 — visually about the same but enough
        // room to render a small 5-bar waveform when listening.
        height: 40,
        minWidth: listening ? 100 : 40,
        padding: listening ? "0 12px" : 0,
        borderRadius: 10,
        border: `1px solid ${listening ? "#EF4444" : "var(--content-border)"}`,
        background: listening ? "#EF4444" : "var(--content-secondary)",
        color: listening ? "#fff" : "var(--text-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexShrink: 0,
        transition: "min-width 200ms ease-out, padding 200ms ease-out",
        animation: listening ? "pulse-mic 1.5s ease-in-out infinite" : "none",
      }}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
      {listening && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 18,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: 3,
                background: "#fff",
                borderRadius: 2,
                animation: `voice-bar 900ms ease-in-out ${i * 100}ms infinite`,
                height: 6,
              }}
            />
          ))}
        </span>
      )}
      <style jsx>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        @keyframes voice-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
    </button>
  );
}
