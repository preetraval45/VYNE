"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  AlertCircle,
} from "lucide-react";
import { useCallStore } from "@/lib/stores/call";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { MeetingRecapModal } from "@/components/chat/MeetingRecapModal";
import { useMessages } from "@/hooks/useMessages";
import { AINotesPanel } from "./AINotesPanel";

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Mounted ONCE in the dashboard layout. Renders the call UI globally so that
 * starting a call survives page navigation, channel switches, and any
 * ChatArea re-renders. Reads everything from useCallStore.
 */
export function GlobalCallPanel() {
  const status = useCallStore((s) => s.status);
  const minimized = useCallStore((s) => s.isMinimized);
  const error = useCallStore((s) => s.error);
  const recap = useCallStore((s) => s.recap);
  const clearError = useCallStore((s) => s.clearError);
  const dismissRecap = useCallStore((s) => s.dismissRecap);
  const toggleActionItem = useCallStore((s) => s.toggleActionItem);

  return (
    <>
      <AnimatePresence>
        {status !== "idle" && status !== "ended" && <CallOverlay />}
      </AnimatePresence>

      <AnimatePresence>
        {error && <ErrorToast error={error} onDismiss={clearError} />}
      </AnimatePresence>

      <AnimatePresence>
        {recap && (
          <MeetingRecapModal
            recap={recap}
            onDismiss={dismissRecap}
            onToggleActionItem={toggleActionItem}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ErrorToast({
  error,
  onDismiss,
}: {
  readonly error: string;
  readonly onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        padding: "12px 16px",
        borderRadius: 12,
        background: "rgba(239,68,68,0.95)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 12px 40px rgba(239,68,68,0.4)",
        maxWidth: 480,
      }}
    >
      <AlertCircle size={16} />
      <span style={{ flex: 1 }}>{error}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          border: "none",
          background: "rgba(255,255,255,0.2)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={11} />
      </button>
    </motion.div>
  );
}

function CallOverlay() {
  const status = useCallStore((s) => s.status);
  const mode = useCallStore((s) => s.mode);
  const channelId = useCallStore((s) => s.channelId);
  const channelName = useCallStore((s) => s.channelName);
  const durationSec = useCallStore((s) => s.durationSec);
  const isMuted = useCallStore((s) => s.isMuted);
  const isVideoOff = useCallStore((s) => s.isVideoOff);
  const isScreenSharing = useCallStore((s) => s.isScreenSharing);
  const isRecording = useCallStore((s) => s.isRecording);
  const isTranscribing = useCallStore((s) => s.isTranscribing);
  const isMinimized = useCallStore((s) => s.isMinimized);
  const localStream = useCallStore((s) => s.localStream);
  const screenStream = useCallStore((s) => s.screenStream);
  const remoteParticipants = useCallStore((s) => s.remoteParticipants);
  const endCall = useCallStore((s) => s.endCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleVideo = useCallStore((s) => s.toggleVideo);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const toggleRecording = useCallStore((s) => s.toggleRecording);
  const toggleTranscription = useCallStore((s) => s.toggleTranscription);
  const toggleMinimize = useCallStore((s) => s.toggleMinimize);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const totalParticipants = remoteParticipants.length + 1;
  const isSolo = mode === "solo";

  // ── Minimized pill ──────────────────────────────────────────────
  if (isMinimized) {
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
          background:
            "linear-gradient(135deg, var(--content-bg), var(--content-secondary))",
          border: "1px solid rgba(108, 71, 255, 0.4)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 10px 30px rgba(108, 71, 255, 0.25)",
          minWidth: 280,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(108, 71, 255, 0.3), rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--vyne-accent, var(--vyne-purple))",
          }}
        >
          {mode === "video" ? <Video size={16} /> : <Mic size={16} />}
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
            {channelName}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {status === "connecting"
              ? "Connecting…"
              : isSolo
                ? `${formatDuration(durationSec)} · Solo`
                : `${formatDuration(durationSec)} · ${totalParticipants} on call`}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          style={pillBtn(isMuted ? "#EF4444" : undefined)}
        >
          {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <button
          type="button"
          onClick={toggleMinimize}
          aria-label="Expand call"
          style={pillBtn()}
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          onClick={endCall}
          aria-label="End call"
          style={pillBtn("#EF4444", true)}
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
        background:
          "radial-gradient(ellipse at top, rgba(108, 71, 255, 0.08), rgba(8, 8, 16, 0.96) 60%)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: status === "active" ? "#10B981" : "#F59E0B",
            boxShadow:
              status === "active"
                ? "0 0 12px rgba(16,185,129,0.6)"
                : "0 0 12px rgba(245,158,11,0.6)",
          }}
        />
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {channelName ?? "Call"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {status === "connecting"
              ? "Connecting…"
              : isSolo
                ? `${formatDuration(durationSec)} · Solo session`
                : `${formatDuration(durationSec)} · ${totalParticipants} participant${totalParticipants > 1 ? "s" : ""}`}
            {isRecording && (
              <span style={{ color: "#FCA5A5", marginLeft: 8 }}>
                ● Recording
              </span>
            )}
          </div>
        </div>
        <div
          style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            type="button"
            onClick={() => {
              if (!isTranscribing) toggleTranscription();
              setAiPanelOpen((o) => !o);
            }}
            title="VYNE AI live transcribe & summarize"
            style={topPillBtn(
              isTranscribing,
              "rgba(108, 71, 255, 0.4)",
              "#C4B5FD",
              "rgba(108, 71, 255, 0.2)",
            )}
          >
            <Sparkles size={12} />
            {isTranscribing ? "AI Notes (live)" : "AI Notes"}
          </button>
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Record meeting"}
            style={topPillBtn(
              isRecording,
              "rgba(239,68,68,0.5)",
              "#FCA5A5",
              "rgba(239,68,68,0.18)",
            )}
          >
            <Circle size={12} fill={isRecording ? "#EF4444" : "none"} />
            {isRecording ? "Stop rec" : "Record"}
          </button>
          {channelId && (
            <button
              type="button"
              onClick={() => setChatOpen((o) => !o)}
              title="Show in-call chat"
              style={topPillBtn(
                chatOpen,
                "rgba(34,197,94,0.4)",
                "#86EFAC",
                "rgba(34,197,94,0.18)",
              )}
            >
              <FileText size={12} />
              Chat
            </button>
          )}
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize call"
            title="Minimize"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
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
        {/* Screen share */}
        {isScreenSharing && screenStream && (
          <div
            style={{
              flex: 2,
              borderRadius: 16,
              overflow: "hidden",
              background: "#000",
              position: "relative",
              border: "2px solid rgba(108, 71, 255, 0.5)",
              boxShadow: "0 8px 32px rgba(108, 71, 255, 0.25)",
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
                padding: "5px 10px",
                borderRadius: 8,
                background: "rgba(108, 71, 255, 0.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <Monitor size={11} /> Sharing your screen
            </div>
          </div>
        )}

        {/* Participant tiles */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: isScreenSharing
              ? "1fr"
              : `repeat(${Math.min(2, Math.ceil(Math.sqrt(totalParticipants)))}, 1fr)`,
            gap: 12,
            alignContent: "start",
            overflowY: "auto",
            paddingBottom: 8,
          }}
        >
          <ParticipantTile
            name="You"
            isSpeaking={false}
            isMuted={isMuted}
            isVideoOff={isVideoOff || mode === "voice"}
            videoRef={localVideoRef}
            stream={localStream}
            isLocal
          />
          {remoteParticipants.map((p) => (
            <ParticipantTile
              key={p.id}
              name={p.name}
              isSpeaking={p.isSpeaking}
              isMuted={p.isMuted}
              isVideoOff={p.isVideoOff}
            />
          ))}
        </div>

        {/* AI Notes panel — tabbed Notes / Transcript / Actions */}
        {aiPanelOpen && (
          <AINotesPanel onClose={() => setAiPanelOpen(false)} />
        )}

        {/* In-call chat panel */}
        {chatOpen && channelId && (
          <InCallChatPanel
            channelId={channelId}
            channelName={channelName ?? ""}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Control bar */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <ControlButton
          onClick={toggleMute}
          active={!isMuted}
          danger={isMuted}
          icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          label={isMuted ? "Unmute" : "Mute"}
        />
        <ControlButton
          onClick={toggleVideo}
          active={!isVideoOff && mode === "video"}
          icon={
            isVideoOff || mode === "voice" ? (
              <VideoOff size={18} />
            ) : (
              <Video size={18} />
            )
          }
          label={
            mode === "voice"
              ? "Start video"
              : isVideoOff
                ? "Start video"
                : "Stop video"
          }
        />
        <ControlButton
          onClick={toggleScreenShare}
          active={isScreenSharing}
          icon={isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
          label={isScreenSharing ? "Stop sharing" : "Share screen"}
        />
        <ControlButton
          onClick={toggleRecording}
          active={isRecording}
          danger={isRecording}
          icon={
            <Circle
              size={18}
              fill={isRecording ? "#EF4444" : "none"}
              strokeWidth={isRecording ? 0 : 2}
            />
          }
          label={isRecording ? "Stop recording" : "Record"}
        />
        <ControlButton
          onClick={() => {
            if (!isTranscribing) toggleTranscription();
            setAiPanelOpen((o) => !o);
          }}
          active={aiPanelOpen}
          icon={<FileText size={18} />}
          label="AI notes"
        />
        <ControlButton
          icon={<Users size={18} />}
          label="Participants"
          active={false}
        />
        <button
          type="button"
          onClick={endCall}
          style={{
            padding: "0 28px",
            height: 56,
            borderRadius: 28,
            border: "none",
            background:
              "linear-gradient(135deg, #EF4444, #DC2626)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 24px rgba(239,68,68,0.45)",
            letterSpacing: "-0.005em",
          }}
        >
          <PhoneOff size={17} /> Leave call
        </button>
      </div>
    </motion.div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function ParticipantTile({
  name,
  isSpeaking,
  isMuted,
  isVideoOff,
  videoRef,
  stream,
  isLocal,
}: {
  readonly name: string;
  readonly isSpeaking: boolean;
  readonly isMuted: boolean;
  readonly isVideoOff: boolean;
  readonly videoRef?: React.RefObject<HTMLVideoElement | null>;
  readonly stream?: MediaStream | null;
  readonly isLocal?: boolean;
}) {
  const showVideo =
    !isVideoOff && stream && stream.getVideoTracks().length > 0;
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16 / 10",
        borderRadius: 16,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1626 100%)",
        border: isSpeaking
          ? "2px solid #10B981"
          : "2px solid rgba(255,255,255,0.06)",
        transition: "border-color 200ms",
        boxShadow: isSpeaking
          ? "0 0 24px rgba(16,185,129,0.35)"
          : "0 4px 20px rgba(0,0,0,0.3)",
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
          <UserAvatar name={name} size={80} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            backdropFilter: "blur(6px)",
            letterSpacing: "-0.005em",
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
              background: "rgba(239,68,68,0.9)",
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

function ControlButton({
  onClick,
  icon,
  label,
  active,
  danger,
}: {
  readonly onClick?: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly active: boolean;
  readonly danger?: boolean;
}) {
  let bg = "rgba(255,255,255,0.08)";
  let color = "rgba(255,255,255,0.9)";
  let glow = "none";
  if (danger) {
    bg = "rgba(239,68,68,0.22)";
    color = "#FCA5A5";
    glow = "0 0 18px rgba(239,68,68,0.3)";
  } else if (active) {
    bg = "rgba(108, 71, 255, 0.28)";
    color = "#C4B5FD";
    glow = "0 0 18px rgba(108, 71, 255, 0.3)";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "none",
        background: bg,
        color,
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 150ms, transform 100ms",
        boxShadow: glow,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.06)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      {icon}
    </button>
  );
}

function SidePanel({
  title,
  icon,
  children,
  onClose,
}: {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{
        width: 320,
        maxWidth: "90vw",
        background: "rgba(20, 20, 30, 0.92)",
        border: "1px solid rgba(108, 71, 255, 0.3)",
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
        backdropFilter: "blur(10px)",
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
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
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
      {children}
    </motion.div>
  );
}

function InCallChatPanel({
  channelId,
  channelName,
  onClose,
}: {
  readonly channelId: string;
  readonly channelName: string;
  readonly onClose: () => void;
}) {
  const { messages, sendMessage } = useMessages(channelId, false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <SidePanel
      title={`Chat · ${channelName}`}
      icon={<FileText size={14} style={{ color: "#86EFAC" }} />}
      onClose={onClose}
    >
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.5,
          minHeight: 200,
        }}
      >
        {messages.slice(-30).map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <span
              style={{
                fontWeight: 600,
                color: "#86EFAC",
                marginRight: 6,
              }}
            >
              {m.author.name}:
            </span>
            {m.content}
          </div>
        ))}
        {messages.length === 0 && (
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontStyle: "italic",
            }}
          >
            No messages yet — start chatting during the call.
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          sendMessage(draft);
          setDraft("");
        }}
        style={{
          padding: 10,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 6,
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Send to channel…"
          style={{
            flex: 1,
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          style={{
            padding: "0 12px",
            borderRadius: 8,
            border: "none",
            background: draft.trim()
              ? "var(--vyne-accent, var(--vyne-purple))"
              : "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: draft.trim() ? "pointer" : "default",
          }}
        >
          Send
        </button>
      </form>
    </SidePanel>
  );
}

function pillBtn(bg?: string, solid?: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: solid ? "none" : "1px solid var(--content-border)",
    cursor: "pointer",
    background: bg ?? "var(--content-secondary)",
    color: bg && solid ? "#fff" : bg ? "#fff" : "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function topPillBtn(
  active: boolean,
  borderColor: string,
  textColor: string,
  bgActive: string,
): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 9,
    border: `1px solid ${active ? borderColor : "rgba(255,255,255,0.15)"}`,
    background: active ? bgActive : "rgba(255,255,255,0.04)",
    color: active ? textColor : "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
}
