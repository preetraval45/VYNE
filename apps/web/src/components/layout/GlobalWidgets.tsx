"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Coffee,
  Target,
  X,
  StickyNote,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Search,
} from "lucide-react";
import { usePomodoroStore } from "@/lib/stores/pomodoro";

// ─── Global widgets (mounted once in dashboard layout) ────────────
export function GlobalWidgets() {
  return (
    <>
      <PomodoroWidget />
      <QuickNoteFab />
      <WorkspaceSwitcherTrigger />
    </>
  );
}

// ─── 1. Pomodoro / focus timer ────────────────────────────────────
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function PomodoroWidget() {
  const running = usePomodoroStore((s) => s.running);
  const phase = usePomodoroStore((s) => s.phase);
  const remaining = usePomodoroStore((s) => s.remainingSec);
  const completedFocus = usePomodoroStore((s) => s.completedFocusCount);
  const settings = usePomodoroStore((s) => s.settings);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const reset = usePomodoroStore((s) => s.reset);
  const skip = usePomodoroStore((s) => s.skip);
  const tick = usePomodoroStore((s) => s.tick);
  const updateSettings = usePomodoroStore((s) => s.updateSettings);

  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Tick each second while running
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => tick(), 1000);
    return () => clearInterval(iv);
  }, [running, tick]);

  // Keyboard: P toggles visibility
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setHidden((h) => !h);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (hidden) return null;

  const totalSec =
    phase === "focus"
      ? settings.focusMinutes * 60
      : phase === "shortBreak"
        ? settings.shortBreakMinutes * 60
        : settings.longBreakMinutes * 60;
  const progress = 1 - remaining / totalSec;
  const strokeColor =
    phase === "focus"
      ? "var(--vyne-purple)"
      : phase === "shortBreak"
        ? "#22C55E"
        : "#3B82F6";
  const label =
    phase === "focus"
      ? "Focus"
      : phase === "shortBreak"
        ? "Short break"
        : "Long break";
  const PhaseIcon = phase === "focus" ? Target : Coffee;

  return (
    <div
      aria-label="Pomodoro timer"
      style={{
        position: "fixed",
        right: 18,
        bottom: 82,
        zIndex: 180,
      }}
    >
      {expanded ? (
        <div
          style={{
            width: 260,
            padding: 14,
            borderRadius: 14,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PhaseIcon size={13} style={{ color: strokeColor }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: strokeColor,
                flex: 1,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              }}
              title="Completed focus sessions today"
            >
              🍅 × {completedFocus}
            </span>
            <button
              type="button"
              aria-label="Timer settings"
              onClick={() => setSettingsOpen((v) => !v)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⚙
            </button>
            <button
              type="button"
              aria-label="Minimise timer"
              onClick={() => setExpanded(false)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Ring + time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
            }}
          >
            <div
              style={{
                position: "relative",
                width: 140,
                height: 140,
              }}
            >
              <svg
                width={140}
                height={140}
                viewBox="0 0 140 140"
                aria-hidden="true"
              >
                <circle
                  cx={70}
                  cy={70}
                  r={62}
                  fill="none"
                  stroke="var(--content-secondary)"
                  strokeWidth={8}
                />
                <circle
                  cx={70}
                  cy={70}
                  r={62}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 62}`}
                  strokeDashoffset={`${(1 - progress) * 2 * Math.PI * 62}`}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  style={{ transition: "stroke-dashoffset 0.5s linear" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatTime(remaining)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
            }}
          >
            {running ? (
              <button
                type="button"
                onClick={pause}
                aria-label="Pause"
                style={ctrlBtn(strokeColor)}
              >
                <Pause size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                aria-label="Start"
                style={ctrlBtn(strokeColor)}
              >
                <Play size={14} fill="currentColor" />
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              aria-label="Reset"
              style={ctrlBtnGhost()}
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={skip}
              aria-label="Skip to next phase"
              style={ctrlBtnGhost()}
            >
              <SkipForward size={13} />
            </button>
          </div>

          {/* Inline settings */}
          {settingsOpen && (
            <div
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12,
                color: "var(--text-primary)",
              }}
            >
              <LabelRow label="Focus (min)">
                <input
                  type="number"
                  min={5}
                  max={90}
                  value={settings.focusMinutes}
                  onChange={(e) =>
                    updateSettings({ focusMinutes: Number(e.target.value) })
                  }
                  style={numInput}
                  aria-label="Focus minutes"
                />
              </LabelRow>
              <LabelRow label="Short break (min)">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.shortBreakMinutes}
                  onChange={(e) =>
                    updateSettings({ shortBreakMinutes: Number(e.target.value) })
                  }
                  style={numInput}
                  aria-label="Short break minutes"
                />
              </LabelRow>
              <LabelRow label="Long break (min)">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={settings.longBreakMinutes}
                  onChange={(e) =>
                    updateSettings({ longBreakMinutes: Number(e.target.value) })
                  }
                  style={numInput}
                  aria-label="Long break minutes"
                />
              </LabelRow>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.soundOn}
                  onChange={(e) => updateSettings({ soundOn: e.target.checked })}
                  style={{ accentColor: "#6C47FF" }}
                />
                Play chime on phase change
              </label>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Pomodoro: ${label} · ${formatTime(remaining)}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${strokeColor}40`,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <PhaseIcon size={13} style={{ color: strokeColor }} />
          {formatTime(remaining)}
          {running && (
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: strokeColor,
                animation: "vyne-pulse 1.3s ease-in-out infinite",
              }}
            />
          )}
          <style>{`@keyframes vyne-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
        </button>
      )}
    </div>
  );
}

const numInput: React.CSSProperties = {
  width: 60,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  outline: "none",
  textAlign: "right",
};

function LabelRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function ctrlBtn(color: string): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "none",
    background: color,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(108,71,255,0.3)",
  };
}

function ctrlBtnGhost(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

// ─── 2. Quick-note floating action button ─────────────────────────
interface QuickNote {
  id: string;
  body: string;
  createdAt: string;
  pinned?: boolean;
}

function loadNotes(): QuickNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("vyne-quick-notes");
    return raw ? (JSON.parse(raw) as QuickNote[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: QuickNote[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vyne-quick-notes", JSON.stringify(notes));
  } catch {
    // ignore
  }
}

function QuickNoteFab() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  // Keyboard: N opens a new quick note (when not typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => textareaRef.current?.focus(), 60);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function saveDraft() {
    const text = draft.trim();
    if (!text) return;
    const next: QuickNote[] = [
      {
        id: `qn-${Date.now()}`,
        body: text,
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ];
    setNotes(next);
    saveNotes(next);
    setDraft("");
  }

  function remove(id: string) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    saveNotes(next);
  }

  function togglePin(id: string) {
    const next = notes.map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned } : n,
    );
    // Sort pinned first
    next.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    setNotes(next);
    saveNotes(next);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Quick note (N)"
        onClick={() => {
          setOpen(true);
          setTimeout(() => textareaRef.current?.focus(), 60);
        }}
        title="Jot a quick note · press N anywhere"
        style={{
          position: "fixed",
          right: 18,
          bottom: 20,
          zIndex: 180,
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6C47FF, #8B6BFF)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(108,71,255,0.4)",
        }}
      >
        <StickyNote size={20} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Quick notes"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "70vh",
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--content-border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <StickyNote size={14} style={{ color: "var(--vyne-purple)" }} />
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Quick notes
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {notes.length} saved
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                style={{
                  width: 24,
                  height: 24,
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
                <X size={12} />
              </button>
            </header>

            <div
              style={{
                padding: 12,
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    saveDraft();
                  }
                }}
                placeholder="Jot something… (⌘+Enter saves)"
                aria-label="New note"
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={saveDraft}
                disabled={!draft.trim()}
                style={{
                  marginTop: 6,
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: draft.trim()
                    ? "var(--vyne-purple)"
                    : "var(--content-border)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: draft.trim() ? "pointer" : "default",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Plus size={11} /> Save
              </button>
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 10,
                margin: 0,
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {notes.length === 0 && (
                <li
                  style={{
                    textAlign: "center",
                    padding: "30px 10px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  No notes yet — the fastest way to capture a thought while
                  you&apos;re in flow.
                </li>
              )}
              {notes.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${n.pinned ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background: n.pinned
                      ? "rgba(108,71,255,0.05)"
                      : "var(--content-secondary)",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-primary)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {n.body}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        marginTop: 3,
                        display: "block",
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                      }}
                    >
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePin(n.id)}
                    aria-label={n.pinned ? "Unpin" : "Pin"}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      border: "none",
                      background: "transparent",
                      color: n.pinned
                        ? "var(--vyne-purple)"
                        : "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label="Delete"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      border: "none",
                      background: "transparent",
                      color: "var(--status-danger)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

// ─── 3. Workspace switcher (⌘+⇧+O) ────────────────────────────────
interface Workspace {
  id: string;
  name: string;
  role: string;
  url?: string;
  active: boolean;
}

const DEMO_WORKSPACES: Workspace[] = [
  { id: "demo-org", name: "VYNE Demo Org", role: "Owner", active: true },
  { id: "acme", name: "Acme Manufacturing", role: "Admin", active: false },
  { id: "northwind", name: "Northwind Logistics", role: "Member", active: false },
  { id: "bluefin", name: "Bluefin Robotics", role: "Viewer", active: false },
  { id: "helios", name: "Helios Systems", role: "Admin", active: false },
];

function WorkspaceSwitcherTrigger() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘+⇧+O or Ctrl+⇧+O
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "O" || e.key === "o")) {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActiveIdx(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = DEMO_WORKSPACES.filter((w) =>
    w.name.toLowerCase().includes(query.toLowerCase()),
  );

  const choose = useCallback(
    (ws: Workspace) => {
      setOpen(false);
      if (ws.active) return;
      // "Switch" in demo mode = toast + navigate home
      try {
        localStorage.setItem("vyne-active-workspace", ws.id);
      } catch {
        // ignore
      }
      router.push("/home");
      // Simple toast via transient banner
      globalThis.dispatchEvent(
        new CustomEvent("vyne:toast", { detail: `Switched to ${ws.name}` }),
      );
    },
    [router],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Switch workspace"
      aria-modal="true"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 400,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 20px 0",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--sidebar-bg)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
          color: "#fff",
        }}
      >
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Building2 size={15} style={{ color: "#B8A3FF" }} />
          <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
            Switch workspace
          </span>
          <kbd
            style={{
              padding: "2px 7px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            ⌘⇧O
          </kbd>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={12} />
          </button>
        </header>

        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[activeIdx]) {
                e.preventDefault();
                choose(filtered[activeIdx]);
              }
            }}
            placeholder="Type a workspace name…"
            aria-label="Search workspaces"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 6,
            margin: 0,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 && (
            <li
              style={{
                padding: "24px 10px",
                textAlign: "center",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              No workspaces match &ldquo;{query}&rdquo;.
            </li>
          )}
          {filtered.map((w, i) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => choose(w)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background:
                    i === activeIdx ? "rgba(108,71,255,0.18)" : "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    background: `linear-gradient(135deg, ${colorFor(w.id)}, ${colorFor(w.id)}88)`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {w.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {w.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {w.role}
                  </div>
                </div>
                {w.active && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.2)",
                      color: "#4ADE80",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={10} /> Current
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <footer
          style={{
            padding: "8px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            gap: 14,
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ switch</span>
          <span>Esc close</span>
        </footer>
      </div>
    </div>
  );
}

function colorFor(id: string): string {
  const colors = [
    "#6C47FF",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}
