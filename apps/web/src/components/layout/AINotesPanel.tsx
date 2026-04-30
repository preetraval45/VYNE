"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  X,
  CheckSquare,
  Square,
  MessageCircle,
  Lightbulb,
  Flag,
  HelpCircle,
  Clock,
} from "lucide-react";
import { useCallStore, type TranscriptEntry } from "@/lib/stores/call";

type Tab = "notes" | "transcript" | "actions";

interface AINotesPanelProps {
  readonly onClose: () => void;
}

interface NoteBullet {
  id: string;
  text: string;
  type: "topic" | "decision" | "question" | "highlight";
  timestamp: number;
}

const TYPE_ICONS: Record<NoteBullet["type"], React.ReactNode> = {
  topic: <Lightbulb size={11} />,
  decision: <Flag size={11} />,
  question: <HelpCircle size={11} />,
  highlight: <MessageCircle size={11} />,
};

const TYPE_COLORS: Record<NoteBullet["type"], string> = {
  topic: "#A78BFA",
  decision: "#F59E0B",
  question: "var(--vyne-accent, #06B6D4)",
  highlight: "#10B981",
};

const TYPE_LABELS: Record<NoteBullet["type"], string> = {
  topic: "Topic",
  decision: "Decision",
  question: "Question",
  highlight: "Highlight",
};

export function AINotesPanel({ onClose }: AINotesPanelProps) {
  const transcript = useCallStore((s) => s.transcript);
  const liveActionItems = useCallStore((s) => s.liveActionItems);
  const isTranscribing = useCallStore((s) => s.isTranscribing);
  const toggleTranscription = useCallStore((s) => s.toggleTranscription);
  const toggleActionItem = useCallStore((s) => s.toggleActionItem);
  const callStartTime = useCallStore((s) => Date.now() - s.durationSec * 1000);

  const [tab, setTab] = useState<Tab>("notes");
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-extract structured notes from the transcript
  const notes = useMemo<NoteBullet[]>(
    () => buildNotes(transcript),
    [transcript],
  );

  useEffect(() => {
    if (tab === "transcript" && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript.length, tab]);

  const finalCount = transcript.filter((t) => t.isFinal).length;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{
        width: 360,
        maxWidth: "90vw",
        background: "rgba(20, 20, 30, 0.94)",
        border: "1px solid rgba(108, 71, 255, 0.3)",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#fff",
        }}
      >
        <Sparkles size={14} style={{ color: "#A78BFA" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>VYNE AI Notes</span>
        {isTranscribing && (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: 99,
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#10B981",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#10B981",
                animation: "pulse 1.4s infinite",
              }}
            />
            LIVE
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI notes"
          style={{
            marginLeft: "auto",
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab strip */}
      <div
        style={{
          display: "flex",
          padding: "4px 6px",
          gap: 2,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        <TabButton
          label="Notes"
          count={notes.length}
          active={tab === "notes"}
          onClick={() => setTab("notes")}
        />
        <TabButton
          label="Transcript"
          count={finalCount}
          active={tab === "transcript"}
          onClick={() => setTab("transcript")}
        />
        <TabButton
          label="Actions"
          count={liveActionItems.length}
          active={tab === "actions"}
          onClick={() => setTab("actions")}
        />
      </div>

      {/* Content */}
      <div
        ref={tab === "transcript" ? transcriptScrollRef : undefined}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.55,
          minHeight: 200,
        }}
      >
        {!isTranscribing && transcript.length === 0 && (
          <EmptyState
            onStart={toggleTranscription}
            isTranscribing={isTranscribing}
          />
        )}

        {tab === "notes" &&
          (notes.length === 0 && isTranscribing ? (
            <Listening />
          ) : (
            notes.map((n) => (
              <NoteBulletRow
                key={n.id}
                note={n}
                callStartTime={callStartTime}
              />
            ))
          ))}

        {tab === "transcript" &&
          (transcript.length === 0 && isTranscribing ? (
            <Listening />
          ) : (
            <TranscriptView
              transcript={transcript}
              callStartTime={callStartTime}
            />
          ))}

        {tab === "actions" &&
          (liveActionItems.length === 0 ? (
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                fontStyle: "italic",
                padding: "20px 0",
                textAlign: "center",
                fontSize: 12,
              }}
            >
              {isTranscribing
                ? "Listening for action items… speak phrases like \"I'll send\", \"we need to\", or \"let's schedule\"."
                : "Action items will appear here once you start AI Notes."}
            </div>
          ) : (
            liveActionItems.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleActionItem(a.id)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: a.done
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(255,255,255,0.03)",
                  color: a.done
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.9)",
                  textDecoration: a.done ? "line-through" : "none",
                  textAlign: "left",
                  width: "100%",
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: 1.5,
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    color: a.done ? "#10B981" : "rgba(255,255,255,0.5)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {a.done ? <CheckSquare size={14} /> : <Square size={14} />}
                </span>
                {a.text}
              </button>
            ))
          ))}
      </div>

      <style>
        {`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}
      </style>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "7px 8px",
        borderRadius: 7,
        border: "none",
        background: active ? "rgba(108, 71, 255, 0.18)" : "transparent",
        color: active ? "#C4B5FD" : "rgba(255,255,255,0.6)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        transition: "all 0.15s",
      }}
    >
      {label}
      {count > 0 && (
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 99,
            background: active
              ? "rgba(108, 71, 255, 0.3)"
              : "rgba(255,255,255,0.08)",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NoteBulletRow({
  note,
  callStartTime,
}: {
  readonly note: NoteBullet;
  readonly callStartTime: number;
}) {
  const elapsed = Math.max(0, Math.floor((note.timestamp - callStartTime) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: `${TYPE_COLORS[note.type]}20`,
          color: TYPE_COLORS[note.type],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {TYPE_ICONS[note.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: TYPE_COLORS[note.type],
            }}
          >
            {TYPE_LABELS[note.type]}
          </span>
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Clock size={9} />
            {mm}:{ss}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.9)",
            lineHeight: 1.5,
          }}
        >
          {note.text}
        </div>
      </div>
    </div>
  );
}

function TranscriptView({
  transcript,
  callStartTime,
}: {
  readonly transcript: TranscriptEntry[];
  readonly callStartTime: number;
}) {
  // Group consecutive entries from the same speaker into blocks
  const blocks = useMemo(() => groupBySpeaker(transcript), [transcript]);
  return (
    <>
      {blocks.map((b, i) => {
        const elapsed = Math.max(
          0,
          Math.floor((b.firstTimestamp - callStartTime) / 1000),
        );
        const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const ss = String(elapsed % 60).padStart(2, "0");
        return (
          <div
            key={i}
            style={{
              marginBottom: 14,
              opacity: b.allFinal ? 1 : 0.65,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#C4B5FD",
                }}
              >
                {b.speaker}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Clock size={9} />
                {mm}:{ss}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.55,
              }}
            >
              {b.text}
              {!b.allFinal && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 4,
                    color: "rgba(255,255,255,0.4)",
                    fontStyle: "italic",
                  }}
                >
                  …
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Listening() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "30px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 16,
              borderRadius: 2,
              background: "#A78BFA",
              animation: `bar ${0.8 + i * 0.1}s ease-in-out ${i * 0.1}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          fontStyle: "italic",
        }}
      >
        Listening… speak to populate notes
      </div>
      <style>
        {`@keyframes bar { from { height: 4px; } to { height: 18px; } }`}
      </style>
    </div>
  );
}

function EmptyState({
  onStart,
  isTranscribing,
}: {
  readonly onStart: () => void;
  readonly isTranscribing: boolean;
}) {
  if (isTranscribing) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "20px 4px",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(108, 71, 255, 0.25), rgba(167, 139, 250, 0.15))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#A78BFA",
        }}
      >
        <Sparkles size={20} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        AI Notes are off
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          maxWidth: 260,
          lineHeight: 1.5,
        }}
      >
        Turn on live transcription to capture topics, decisions, questions, and
        action items automatically.
      </div>
      <button
        type="button"
        onClick={onStart}
        style={{
          marginTop: 4,
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid rgba(108, 71, 255, 0.5)",
          background: "rgba(108, 71, 255, 0.18)",
          color: "#C4B5FD",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Sparkles size={12} /> Start AI Notes
      </button>
    </div>
  );
}

// ── Note extraction ────────────────────────────────────────────

interface SpeakerBlock {
  speaker: string;
  text: string;
  firstTimestamp: number;
  allFinal: boolean;
}

function groupBySpeaker(transcript: TranscriptEntry[]): SpeakerBlock[] {
  const blocks: SpeakerBlock[] = [];
  for (const entry of transcript) {
    const last = blocks[blocks.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.text += " " + entry.text;
      last.allFinal = last.allFinal && entry.isFinal;
    } else {
      blocks.push({
        speaker: entry.speaker,
        text: entry.text,
        firstTimestamp: entry.timestamp,
        allFinal: entry.isFinal,
      });
    }
  }
  return blocks;
}

function buildNotes(transcript: TranscriptEntry[]): NoteBullet[] {
  const finals = transcript.filter((t) => t.isFinal);
  const notes: NoteBullet[] = [];
  const seen = new Set<string>();
  for (const t of finals) {
    const sentences = t.text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 6);
    for (const s of sentences) {
      const lower = s.toLowerCase();
      // Dedup near-identical sentences
      const key = lower.slice(0, 60);
      if (seen.has(key)) continue;
      const type = classify(s);
      if (!type) continue;
      seen.add(key);
      notes.push({
        id: `${t.id}-${notes.length}`,
        text: capitalize(s.replace(/[.!?]+$/, "")),
        type,
        timestamp: t.timestamp,
      });
    }
  }
  return notes;
}

function classify(sentence: string): NoteBullet["type"] | null {
  const s = sentence.toLowerCase();
  // Question
  if (/\?$/.test(sentence) || /^(what|when|where|why|how|who|can|could|should|would|will|do|does|are|is)\b/.test(s)) {
    return "question";
  }
  // Decision
  if (/\b(decided|we will|we'll|let's go with|going with|approved|agreed|consensus|chose|picked)\b/.test(s)) {
    return "decision";
  }
  // Topic / key statement
  if (s.length > 25 && /\b(important|critical|key|main|focus|priority|because|since|so that|the goal)\b/.test(s)) {
    return "topic";
  }
  // Highlight: first sentences of speech tend to be context-setters
  if (sentence.length > 30 && sentence.length < 200) {
    return "highlight";
  }
  return null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}
