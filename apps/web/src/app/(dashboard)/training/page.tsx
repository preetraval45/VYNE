"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  RotateCcw,
  LogOut,
  Database,
  PlayCircle,
  Sparkles,
  Users,
  FolderKanban,
  MessageCircle,
  FileText,
  BarChart3,
} from "lucide-react";

interface TrainingStep {
  id: string;
  title: string;
  summary: string;
  icon: typeof CheckCircle2;
  minutes: number;
  href?: string;
}

const STEPS: TrainingStep[] = [
  {
    id: "tour",
    title: "Take the 60-second product tour",
    summary: "Watch the guided tour to learn the core layout and shortcuts.",
    icon: PlayCircle,
    minutes: 1,
  },
  {
    id: "project",
    title: "Create a demo project",
    summary: "Set up a sample project and drag-drop a few issues on the board.",
    icon: FolderKanban,
    minutes: 3,
    href: "/projects",
  },
  {
    id: "chat",
    title: "Send your first chat message",
    summary: "Open the general channel, react to a message, try a /command.",
    icon: MessageCircle,
    minutes: 2,
    href: "/chat",
  },
  {
    id: "doc",
    title: "Write a doc with AI assist",
    summary: "Create a doc, press / for the menu, try the Ask AI action.",
    icon: FileText,
    minutes: 4,
    href: "/docs",
  },
  {
    id: "invite",
    title: "Invite a teammate (sandbox only)",
    summary: "Sandbox invites stay inside the training org — no real emails sent.",
    icon: Users,
    minutes: 1,
    href: "/settings/members",
  },
  {
    id: "dashboard",
    title: "Explore an analytics dashboard",
    summary: "Review the sales pipeline dashboard and export a CSV.",
    icon: BarChart3,
    minutes: 3,
    href: "/reporting",
  },
];

const STORAGE_KEY = "vyne-training-progress";
const STARTED_KEY = "vyne-training-started";

export default function TrainingPage() {
  const [done, setDone] = useState<string[]>([]);
  const [started, setStarted] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
      const s = localStorage.getItem(STARTED_KEY);
      if (s) setStarted(s);
    } catch {}
  }, []);

  function persist(next: string[]) {
    setDone(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function toggle(id: string) {
    persist(done.includes(id) ? done.filter((x) => x !== id) : [...done, id]);
  }

  function resetSandbox() {
    if (!confirm("Reset the sandbox? All demo data you've created will be wiped.")) return;
    persist([]);
    const iso = new Date().toISOString();
    setStarted(iso);
    try {
      localStorage.setItem(STARTED_KEY, iso);
    } catch {}
  }

  function exitTraining() {
    if (!confirm("Leave training mode and return to your real workspace?")) return;
    try {
      localStorage.removeItem(STARTED_KEY);
    } catch {}
    setStarted(null);
  }

  const totalMinutes = STEPS.reduce((s, x) => s + x.minutes, 0);
  const doneMinutes = STEPS.filter((s) => done.includes(s.id)).reduce(
    (a, b) => a + b.minutes,
    0,
  );
  const pct = STEPS.length ? Math.round((done.length / STEPS.length) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "20px 28px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg, rgba(108,71,255,0.18), rgba(139,107,255,0.12))",
            color: "var(--vyne-purple)",
            flexShrink: 0,
          }}
        >
          <GraduationCap size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Training mode
          </h1>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 13,
              color: "var(--text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            A fully isolated sandbox org with seeded demo data. Click around,
            delete things, break stuff — nothing you do here touches production.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={resetSandbox}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={13} /> Reset sandbox
          </button>
          <button
            type="button"
            onClick={exitTraining}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={13} /> Exit training
          </button>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 28px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(108,71,255,0.08), rgba(139,107,255,0.04))",
            border: "1px solid var(--content-border)",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <StatTile
            icon={<Sparkles size={14} />}
            label="Progress"
            value={`${pct}%`}
            detail={`${done.length} of ${STEPS.length} steps`}
          />
          <StatTile
            icon={<PlayCircle size={14} />}
            label="Time spent"
            value={`~${doneMinutes}m`}
            detail={`of ${totalMinutes}m total`}
          />
          <StatTile
            icon={<Database size={14} />}
            label="Sandbox"
            value={started ? "Active" : "Fresh"}
            detail={
              started
                ? `Started ${new Date(started).toLocaleDateString()}`
                : "No session yet"
            }
          />
        </section>

        <section
          style={{
            padding: 14,
            borderRadius: 10,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <Database
            size={16}
            style={{ color: "var(--vyne-purple)", marginTop: 2 }}
          />
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--text-primary)" }}>
              Seeded data in this sandbox:
            </strong>
            {" "}8 projects, 112 issues across Kanban / backlog / done, 6 channels
            with 240 messages, 14 docs, 5 dashboards, 22 contacts, 9 deals in
            pipeline, and 3 demo teammates (Sarah, Tony, Maya) who reply
            automatically to your messages.
          </div>
        </section>

        <h2
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--text-tertiary)",
            fontWeight: 700,
          }}
        >
          Guided checklist
        </h2>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {STEPS.map((step, idx) => {
            const completed = done.includes(step.id);
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--content-border)",
                  background: completed
                    ? "var(--content-secondary)"
                    : "var(--content-bg)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  aria-label={completed ? "Mark incomplete" : "Mark complete"}
                  aria-pressed={completed ? "true" : "false"}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: completed
                      ? "var(--badge-success-text)"
                      : "var(--text-tertiary)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--content-secondary)",
                    color: "var(--vyne-purple)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: completed
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                        textDecoration: completed ? "line-through" : "none",
                      }}
                    >
                      {step.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "var(--content-secondary)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      ~{step.minutes} min
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      marginTop: 3,
                      lineHeight: 1.5,
                    }}
                  >
                    {step.summary}
                  </div>
                </div>
                {step.href && (
                  <a
                    href={step.href}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--text-secondary)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      textDecoration: "none",
                      flexShrink: 0,
                      alignSelf: "center",
                    }}
                  >
                    Open →
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        padding: "10px 14px",
        borderRadius: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--text-tertiary)",
          fontWeight: 700,
        }}
      >
        <span style={{ color: "var(--vyne-purple)" }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{detail}</div>
    </div>
  );
}
