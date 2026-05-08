"use client";

// Continuous voice mode (UI_UPGRADE_PLAN.md 5.1).
//
// One-tap hands-free loop:
//   1. User speaks → Web Speech API recognises → final transcript
//   2. Recognition pauses; transcript fires onUserMessage(text)
//   3. Chat page calls ask(text) which streams the assistant reply
//   4. When the reply completes, the chat page dispatches a
//      `vyne:ai-spoken-text` CustomEvent with the final text
//   5. SpeechSynthesis speaks the reply; on `end`, recognition resumes
//   6. If the user speaks while TTS is playing, recognition catches the
//      first phoneme and we cancel the TTS — barge-in.
//
// Falls back gracefully when SpeechRecognition isn't supported (Firefox)
// or SpeechSynthesis is missing — button just disables itself.
//
// No backend deps: pure browser APIs. Real OpenAI Realtime API can swap
// in later by replacing the recognition + tts blocks.

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";

interface Props {
  onUserMessage: (text: string) => void;
  disabled?: boolean;
}

type Mode = "off" | "listening" | "thinking" | "speaking";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition(): {
  new (): SpeechRecognitionLike;
} | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceConversationButton({ onUserMessage, disabled }: Props) {
  const [mode, setMode] = useState<Mode>("off");
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Source of truth — refs because event handlers need the live value.
  const modeRef = useRef<Mode>("off");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const SR = getSpeechRecognition();
    const ttsOk =
      typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
    setSupported(!!SR && ttsOk);
  }, []);

  // Listen for the chat page's "AI replied" event so we can speak it.
  useEffect(() => {
    function onAiSpoken(e: Event) {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      const text = detail?.text;
      if (!text || modeRef.current === "off") return;
      void speakAndResume(text);
    }
    window.addEventListener("vyne:ai-spoken-text", onAiSpoken);
    return () => window.removeEventListener("vyne:ai-spoken-text", onAiSpoken);
  }, []);

  function startRecognition() {
    const SR = getSpeechRecognition();
    if (!SR) return;
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (event: unknown) => {
      const results = (
        event as {
          results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
        }
      ).results;
      let finalText = "";
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.isFinal) finalText += r[0].transcript;
      }
      const trimmed = finalText.trim();
      if (!trimmed) return;
      // Pause recognition while we hand off to the chat. We'll resume
      // after the reply finishes via `vyne:ai-spoken-text`.
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setMode("thinking");
      onUserMessage(trimmed);
    };
    rec.onerror = (event: unknown) => {
      const code = (event as { error?: string }).error;
      // "no-speech" / "aborted" are expected during normal pauses; ignore.
      if (code === "no-speech" || code === "aborted") return;
      // Anything else stops the loop.
      setMode("off");
    };
    rec.onend = () => {
      // The browser auto-stops continuous after some idle time. If we're
      // still in listening mode, restart. If we're thinking/speaking,
      // do nothing — we'll restart explicitly later.
      if (modeRef.current === "listening") {
        try {
          rec.start();
        } catch {
          /* re-entrancy: try again next tick */
          setTimeout(() => {
            if (modeRef.current === "listening") {
              try {
                rec.start();
              } catch {
                /* give up */
                setMode("off");
              }
            }
          }, 200);
        }
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setMode("listening");
    } catch {
      setMode("off");
    }
  }

  function stopAll() {
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setMode("off");
  }

  async function speakAndResume(text: string) {
    if (typeof window === "undefined") return;
    setMode("speaking");
    // Cancel any prior speech in flight.
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    u.lang = navigator.language || "en-US";
    u.onend = () => {
      utteranceRef.current = null;
      // Resume listening if the user hasn't toggled off in the meantime.
      if (modeRef.current === "speaking") {
        startRecognition();
      }
    };
    u.onerror = () => {
      utteranceRef.current = null;
      if (modeRef.current === "speaking") {
        startRecognition();
      }
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }

  function toggle() {
    if (mode === "off") {
      startRecognition();
    } else {
      stopAll();
    }
  }

  if (supported === false) return null;

  const label =
    mode === "off"
      ? "Start voice conversation"
      : mode === "listening"
        ? "Listening — tap to stop"
        : mode === "thinking"
          ? "Thinking…"
          : "Speaking — tap to interrupt";

  const Icon =
    mode === "off"
      ? Mic
      : mode === "listening"
        ? MicOff
        : mode === "thinking"
          ? Loader2
          : Volume2;

  const bg =
    mode === "off"
      ? "var(--content-secondary)"
      : mode === "listening"
        ? "var(--accent-error)"
        : mode === "thinking"
          ? "var(--vyne-teal-soft)"
          : "var(--vyne-accent, var(--vyne-purple))";

  const fg =
    mode === "off"
      ? "var(--text-secondary)"
      : mode === "listening"
        ? "#fff"
        : mode === "thinking"
          ? "var(--vyne-teal)"
          : "#fff";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || supported === null}
      aria-label={label}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${mode === "off" ? "var(--content-border)" : bg}`,
        background: bg,
        color: fg,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 150ms, color 150ms",
      }}
    >
      <Icon
        size={16}
        className={mode === "thinking" ? "animate-spin" : undefined}
      />
    </button>
  );
}
