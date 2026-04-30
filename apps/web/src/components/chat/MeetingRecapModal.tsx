"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Download,
  X,
  CheckSquare,
  Square,
  Users,
  Clock,
  FileText,
  Send,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import type { MeetingRecap, AiActionItem } from "@/hooks/useCall";

interface MeetingRecapModalProps {
  readonly recap: MeetingRecap;
  readonly onDismiss: () => void;
  readonly onToggleActionItem: (id: string) => void;
  readonly onShareToChat?: (text: string) => void;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${sec}s`;
}

function buildShareText(recap: MeetingRecap): string {
  const lines: string[] = [];
  lines.push(`*Meeting recap*`);
  lines.push(`Duration: ${formatDuration(recap.durationSec)}`);
  lines.push(`Participants: ${recap.participants.join(", ")}`);
  lines.push("");
  lines.push(`*Summary*`);
  lines.push(recap.summary);
  if (recap.decisions.length > 0) {
    lines.push("");
    lines.push(`*Decisions*`);
    recap.decisions.forEach((d) => lines.push(`• ${d}`));
  }
  if (recap.actionItems.length > 0) {
    lines.push("");
    lines.push(`*Action items*`);
    recap.actionItems.forEach((a) =>
      lines.push(`${a.done ? "[x]" : "[ ]"} ${a.text}`),
    );
  }
  return lines.join("\n");
}

export function MeetingRecapModal({
  recap,
  onDismiss,
  onToggleActionItem,
  onShareToChat,
}: MeetingRecapModalProps) {
  const recordingFilename =
    recap.recordingMime?.includes("video") ||
    recap.recordingMime === "video/webm"
      ? "vyne-meeting.webm"
      : "vyne-meeting.webm";

  const [followupDraft, setFollowupDraft] = useState<{
    subject?: string;
    body: string;
  } | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftCopied, setDraftCopied] = useState(false);

  async function generateFollowup() {
    setDraftLoading(true);
    try {
      const context = [
        recap.summary,
        recap.decisions.length > 0
          ? "Decisions:\n" + recap.decisions.map((d) => "- " + d).join("\n")
          : "",
        recap.actionItems.length > 0
          ? "Action items:\n" +
            recap.actionItems.map((a) => "- " + a.text).join("\n")
          : "",
        `Participants: ${recap.participants.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          channel: "email",
          tone: "concise",
          recipient: recap.participants.find((p) => p !== "You") ?? "team",
        }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { subject?: string; body: string };
      setFollowupDraft(json);
    } finally {
      setDraftLoading(false);
    }
  }

  function copyFollowup() {
    if (!followupDraft) return;
    const txt = followupDraft.subject
      ? `Subject: ${followupDraft.subject}\n\n${followupDraft.body}`
      : followupDraft.body;
    void navigator.clipboard.writeText(txt);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 1800);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9997,
        background: "rgba(8, 8, 16, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(108, 71, 255, 0.15)",
              color: "var(--vyne-accent, var(--vyne-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              VYNE AI Meeting Recap
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Generated from {recap.actionItems.length} action items ·{" "}
              {formatDuration(recap.durationSec)}
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close recap"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          className="content-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
          }}
        >
          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <Stat
              icon={<Clock size={12} />}
              label={formatDuration(recap.durationSec)}
            />
            <Stat
              icon={<Users size={12} />}
              label={`${recap.participants.length} participant${recap.participants.length === 1 ? "" : "s"}`}
            />
            {recap.recordingUrl && (
              <Stat
                icon={<FileText size={12} />}
                label="Recording available"
                tone="purple"
              />
            )}
          </div>

          {/* Summary */}
          <Section title="Summary">
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {recap.summary}
            </p>
          </Section>

          {/* Decisions */}
          {recap.decisions.length > 0 && (
            <Section title="Decisions">
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                {recap.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Action items */}
          {recap.actionItems.length > 0 && (
            <Section title="Action items">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recap.actionItems.map((a) => (
                  <ActionRow
                    key={a.id}
                    item={a}
                    onToggle={() => onToggleActionItem(a.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* AI follow-up email drafter */}
          <Section title="Follow-up draft">
            {!followupDraft && (
              <button
                type="button"
                onClick={generateFollowup}
                disabled={draftLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--vyne-accent, var(--vyne-purple))",
                  background: "rgba(108, 71, 255, 0.1)",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: draftLoading ? "default" : "pointer",
                  opacity: draftLoading ? 0.6 : 1,
                }}
              >
                <Mail size={13} />
                {draftLoading
                  ? "Drafting…"
                  : "Draft a follow-up email with VYNE AI"}
              </button>
            )}
            {followupDraft && (
              <div
                style={{
                  border: "1px solid var(--content-border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--content-secondary)",
                }}
              >
                {followupDraft.subject && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    Subject
                  </div>
                )}
                {followupDraft.subject && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 8,
                    }}
                  >
                    {followupDraft.subject}
                  </div>
                )}
                <pre
                  style={{
                    margin: 0,
                    padding: 0,
                    fontSize: 12.5,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                    fontFamily: "inherit",
                  }}
                >
                  {followupDraft.body}
                </pre>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setFollowupDraft(null)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--content-border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={generateFollowup}
                    disabled={draftLoading}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--content-border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={copyFollowup}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: draftCopied
                        ? "rgba(16,185,129,0.18)"
                        : "var(--vyne-accent, var(--vyne-purple))",
                      color: draftCopied ? "#10B981" : "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {draftCopied ? <Check size={11} /> : <Copy size={11} />}
                    {draftCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Recording preview */}
          {recap.recordingUrl && (
            <Section title="Recording">
              {recap.recordingMime?.includes("video") ? (
                <video
                  controls
                  src={recap.recordingUrl}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    background: "#000",
                    maxHeight: 280,
                  }}
                />
              ) : (
                <audio
                  controls
                  src={recap.recordingUrl}
                  style={{ width: "100%" }}
                />
              )}
            </Section>
          )}

          {/* Participants */}
          <Section title="Participants">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recap.participants.map((p) => (
                <span
                  key={p}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: "var(--content-secondary)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--content-border)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {recap.recordingUrl && (
            <a
              href={recap.recordingUrl}
              download={recordingFilename}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <Download size={13} /> Download recording
            </a>
          )}
          {onShareToChat && (
            <button
              type="button"
              onClick={() => {
                onShareToChat(buildShareText(recap));
                onDismiss();
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={13} /> Post recap to channel
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({
  icon,
  label,
  tone,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly tone?: "purple";
}) {
  return (
    <div
      style={{
        padding: "5px 10px",
        borderRadius: 99,
        background:
          tone === "purple"
            ? "rgba(108, 71, 255, 0.12)"
            : "var(--content-secondary)",
        color:
          tone === "purple" ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function ActionRow({
  item,
  onToggle,
}: {
  readonly item: AiActionItem;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "8px 10px",
        borderRadius: 8,
        background: "transparent",
        border: "1px solid var(--content-border)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        color: item.done
          ? "var(--text-tertiary)"
          : "var(--text-primary)",
        textDecoration: item.done ? "line-through" : "none",
      }}
    >
      <span
        style={{
          color: item.done ? "#10B981" : "var(--text-tertiary)",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {item.done ? <CheckSquare size={14} /> : <Square size={14} />}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{item.text}</span>
    </button>
  );
}
