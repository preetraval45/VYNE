"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Sparkles,
  Circle,
  FileText,
  CheckSquare,
  Square,
  Download,
  X,
} from "lucide-react";
import type { UseCallResult, CallParticipant } from "@/hooks/useCall";
import { UserAvatar } from "./UserAvatar";

interface CallPanelProps {
  readonly call: UseCallResult;
  readonly minimized: boolean;
  readonly onToggleMinimize: () => void;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function CallPanel({ call, minimized, onToggleMinimize }: CallPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [call.transcript.length]);

  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (screenVideoRef.current && call.screenStream) {
      screenVideoRef.current.srcObject = call.screenStream;
    }
  }, [call.screenStream]);

  if (call.status === "idle" || call.status === "ended") return null;

  const showVideo = call.mode === "video" && !call.isVideoOff;
  const totalParticipants = call.remoteParticipants.length + 1;

  // ── Minimized pill ──────────────────────────────────────────────
  if (minimized) {
    return (
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        style={{
          position: "fixed",
          bottom: 18,
          right: 18,
          zIndex: 9999,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          minWidth: 280,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(108, 71, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--vyne-accent, var(--vyne-purple))",
          }}
        >
          {call.mode === "video" ? <Video size={15} /> : <Mic size={15} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {call.channelName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {call.status === "connecting"
              ? "Connecting…"
              : `${formatDuration(call.durationSec)} · ${totalParticipants} on call`}
          </div>
        </div>
        <button
          type="button"
          onClick={call.toggleMute}
          aria-label={call.isMuted ? "Unmute" : "Mute"}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: call.isMuted ? "#EF4444" : "var(--content-secondary)",
            color: call.isMuted ? "#fff" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {call.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <button
          type="button"
          onClick={onToggleMinimize}
          aria-label="Expand call"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "1px solid var(--content-border)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          onClick={call.endCall}
          aria-label="End call"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "none",
            background: "#EF4444",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PhoneOff size={13} />
        </button>
      </motion.div>
    );
  }

  // ── Full overlay ───────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(8, 8, 16, 0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: call.status === "active" ? "#10B981" : "#F59E0B",
            animation: call.status === "active" ? "none" : "pulse 1s infinite",
          }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {call.channelName}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {call.status === "connecting"
              ? "Connecting…"
              : `${formatDuration(call.durationSec)} · ${totalParticipants} participant${totalParticipants > 1 ? "s" : ""}`}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {call.isRecording && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#FCA5A5",
                fontSize: 11,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4444",
                  display: "inline-block",
                }}
              />
              REC
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (!call.isTranscribing) {
                setAiPanelOpen(true);
                call.toggleTranscription();
              } else {
                setAiPanelOpen((o) => !o);
              }
            }}
            title="VYNE AI live transcribe & summarize"
            style={{
              padding: "6px 11px",
              borderRadius: 8,
              border: call.isTranscribing
                ? "1px solid rgba(108, 71, 255, 0.6)"
                : "1px solid rgba(108, 71, 255, 0.4)",
              background: call.isTranscribing
                ? "rgba(108, 71, 255, 0.3)"
                : "rgba(108, 71, 255, 0.15)",
              color: "#C4B5FD",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={12} />
            {call.isTranscribing ? "AI Notes (live)" : "AI Notes"}
          </button>
          <button
            type="button"
            onClick={call.toggleRecording}
            title={call.isRecording ? "Stop recording" : "Record meeting"}
            style={{
              padding: "6px 11px",
              borderRadius: 8,
              border: call.isRecording
                ? "1px solid rgba(239,68,68,0.5)"
                : "1px solid rgba(255,255,255,0.15)",
              background: call.isRecording
                ? "rgba(239,68,68,0.18)"
                : "transparent",
              color: call.isRecording ? "#FCA5A5" : "rgba(255,255,255,0.8)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Circle size={12} fill={call.isRecording ? "#EF4444" : "none"} />
            {call.isRecording ? "Stop rec" : "Record"}
          </button>
          <button
            type="button"
            onClick={onToggleMinimize}
            aria-label="Minimize call"
            title="Minimize"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Minimize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main grid area */}
      <div
        style={{
          flex: 1,
          padding: "0 20px",
          display: "flex",
          gap: 14,
          minHeight: 0,
        }}
      >
        {/* Screen share takes priority */}
        {call.isScreenSharing && call.screenStream && (
          <div
            style={{
              flex: 2,
              borderRadius: 14,
              overflow: "hidden",
              background: "#000",
              position: "relative",
              border: "2px solid rgba(108, 71, 255, 0.5)",
            }}
          >
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                padding: "4px 9px",
                borderRadius: 6,
                background: "rgba(108, 71, 255, 0.85)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Monitor size={11} /> Your screen
            </div>
          </div>
        )}

        {/* Participant tiles */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: call.isScreenSharing
              ? "1fr"
              : `repeat(${Math.min(2, Math.ceil(Math.sqrt(totalParticipants)))}, 1fr)`,
            gap: 12,
            alignContent: "start",
            overflowY: "auto",
          }}
        >
          {/* Self tile */}
          <ParticipantTile
            name="You"
            isSpeaking={false}
            isMuted={call.isMuted}
            isVideoOff={call.isVideoOff || call.mode === "voice"}
            videoRef={localVideoRef}
            stream={call.localStream}
            isLocal
          />

          {call.remoteParticipants.map((p) => (
            <RemoteTile key={p.id} participant={p} />
          ))}
        </div>

        {aiPanelOpen && (
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            style={{
              width: 320,
              maxWidth: "90vw",
              background: "rgba(20, 20, 30, 0.85)",
              border: "1px solid rgba(108, 71, 255, 0.3)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
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
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                VYNE AI Notes
              </span>
              <button
                type="button"
                onClick={() => setAiPanelOpen(false)}
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

            {call.liveActionItems.length > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#A78BFA",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  Detected action items
                </div>
                {call.liveActionItems.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: "4px 0",
                      fontSize: 12,
                      color: a.done
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.85)",
                      textDecoration: a.done ? "line-through" : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => call.toggleActionItem(a.id)}
                      aria-label="Toggle action item"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: a.done ? "#10B981" : "rgba(255,255,255,0.5)",
                        padding: 0,
                        display: "flex",
                        marginTop: 2,
                      }}
                    >
                      {a.done ? <CheckSquare size={13} /> : <Square size={13} />}
                    </button>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              ref={transcriptScrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 14px",
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#A78BFA",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                Live transcript
              </div>
              {call.transcript.length === 0 ? (
                <div
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontStyle: "italic",
                  }}
                >
                  {call.isTranscribing
                    ? "Listening… speak to populate the transcript."
                    : "Click 'AI Notes' to start live transcription."}
                </div>
              ) : (
                call.transcript.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      marginBottom: 8,
                      opacity: t.isFinal ? 1 : 0.55,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#C4B5FD",
                        marginRight: 6,
                      }}
                    >
                      {t.speaker}:
                    </span>
                    {t.text}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Control bar */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <ControlButton
          onClick={call.toggleMute}
          active={!call.isMuted}
          danger={call.isMuted}
          icon={call.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          label={call.isMuted ? "Unmute" : "Mute"}
        />
        <ControlButton
          onClick={call.toggleVideo}
          active={!call.isVideoOff && call.mode === "video"}
          icon={
            call.isVideoOff || call.mode === "voice" ? (
              <VideoOff size={18} />
            ) : (
              <Video size={18} />
            )
          }
          label={
            call.mode === "voice"
              ? "Start video"
              : call.isVideoOff
                ? "Start video"
                : "Stop video"
          }
        />
        <ControlButton
          onClick={call.toggleScreenShare}
          active={call.isScreenSharing}
          icon={
            call.isScreenSharing ? (
              <MonitorOff size={18} />
            ) : (
              <Monitor size={18} />
            )
          }
          label={call.isScreenSharing ? "Stop sharing" : "Share screen"}
        />
        <ControlButton
          onClick={call.toggleRecording}
          active={call.isRecording}
          danger={call.isRecording}
          icon={
            <Circle
              size={18}
              fill={call.isRecording ? "#EF4444" : "none"}
              strokeWidth={call.isRecording ? 0 : 2}
            />
          }
          label={call.isRecording ? "Stop recording" : "Record"}
        />
        <ControlButton
          onClick={() => {
            setAiPanelOpen((o) => !o);
            if (!call.isTranscribing) call.toggleTranscription();
          }}
          active={aiPanelOpen}
          icon={<FileText size={18} />}
          label="AI notes & transcript"
        />
        <ControlButton
          icon={<Users size={18} />}
          label="Participants"
          active={false}
        />
        <button
          type="button"
          onClick={call.endCall}
          style={{
            padding: "0 24px",
            height: 48,
            borderRadius: 24,
            border: "none",
            background: "#EF4444",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PhoneOff size={16} /> Leave
        </button>
      </div>

      {call.error && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#FCA5A5",
            fontSize: 12,
          }}
        >
          {call.error}
        </div>
      )}
    </motion.div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

interface ParticipantTileProps {
  readonly name: string;
  readonly isSpeaking: boolean;
  readonly isMuted: boolean;
  readonly isVideoOff: boolean;
  readonly videoRef?: React.RefObject<HTMLVideoElement | null>;
  readonly stream?: MediaStream | null;
  readonly isLocal?: boolean;
}

function ParticipantTile({
  name,
  isSpeaking,
  isMuted,
  isVideoOff,
  videoRef,
  stream,
  isLocal,
}: ParticipantTileProps) {
  const showVideo = !isVideoOff && stream && stream.getVideoTracks().length > 0;
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16 / 10",
        borderRadius: 14,
        overflow: "hidden",
        background: "#1a1a2e",
        border: isSpeaking
          ? "2px solid #10B981"
          : "2px solid rgba(255,255,255,0.05)",
        transition: "border-color 200ms",
      }}
    >
      {showVideo && videoRef ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: isLocal ? "scaleX(-1)" : "none",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UserAvatar name={name} size={72} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            backdropFilter: "blur(4px)",
          }}
        >
          {name}
        </span>
        {isMuted && (
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.85)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MicOff size={11} />
          </span>
        )}
      </div>
    </div>
  );
}

function RemoteTile({ participant }: { participant: CallParticipant }) {
  // Demo: no real remote stream, just placeholder avatar with speaking indicator
  return (
    <ParticipantTile
      name={participant.name}
      isSpeaking={participant.isSpeaking}
      isMuted={participant.isMuted}
      isVideoOff={participant.isVideoOff}
    />
  );
}

interface ControlButtonProps {
  readonly onClick?: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly active: boolean;
  readonly danger?: boolean;
}

function ControlButton({
  onClick,
  icon,
  label,
  active,
  danger,
}: ControlButtonProps) {
  let bg = "rgba(255,255,255,0.08)";
  let color = "rgba(255,255,255,0.85)";
  if (danger) {
    bg = "rgba(239,68,68,0.2)";
    color = "#FCA5A5";
  } else if (active) {
    bg = "rgba(108, 71, 255, 0.25)";
    color = "#C4B5FD";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "none",
        background: bg,
        color,
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 150ms",
      }}
    >
      {icon}
    </button>
  );
}
