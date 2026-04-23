"use client";

import { useRouter } from "next/navigation";
import {
  STAT_CARDS,
  RECENT_ACTIVITY,
  SPRINT_BADGES,
  FOCUS_TASKS,
  AI_RECENT_QUERIES,
  QUICK_ACTIONS,
} from "@/lib/fixtures/home";
import { VisuallyHidden } from "@/components/shared/VisuallyHidden";
import { useAuthStore } from "@/lib/stores/auth";
import { VyneLogo } from "@/components/brand/VyneLogo";

function greetingFor(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Working late";
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  delta,
  deltaColor,
}: Readonly<{
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
}>) {
  return (
    <section
      aria-label={`${label}: ${value}`}
      style={{
        background: "var(--content-bg-secondary)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{ fontSize: 11, marginTop: 4, color: deltaColor }}
        aria-label={`Change: ${delta}`}
      >
        {delta}
      </div>
    </section>
  );
}

// ── Activity item ─────────────────────────────────────────────────
function ActivityItem({
  avatar,
  name,
  action,
  time,
  avatarBg,
}: Readonly<{
  avatar: string;
  name: string;
  action: string;
  time: string;
  avatarBg: string;
}>) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: avatarBg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        {avatar}
      </div>
      <div>
        <div
          style={{ fontSize: 12, color: "var(--text-primary)" }}
          dangerouslySetInnerHTML={{ __html: action }}
        />
        <div
          style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = (user?.name ?? "there").split(" ")[0];
  const greeting = greetingFor(new Date().getHours());

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Topbar */}
      <header
        style={{
          height: 44,
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 8,
          flexShrink: 0,
          background: "var(--content-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VyneLogo variant="mark" markSize={20} />
          <h1
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {greeting}, {firstName} 👋
          </h1>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => router.push("/projects")}
            aria-label="Create new issue"
            style={{
              background: "var(--vyne-purple)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + New Issue
          </button>
          <div
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#06B6D4,#9B59B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            PR
          </div>
        </div>
      </header>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 20 }}
      >
        {/* ── Module Grid (App Drawer) ────────────────── */}
        <section
          aria-label="Modules"
          style={{
            marginBottom: 24,
            padding: "20px 0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 12,
              maxWidth: 800,
              margin: "0 auto",
            }}
          >
            {[
              { label: "Home", icon: "🏠", color: "#E74C3C", href: "/home" },
              {
                label: "Contacts",
                icon: "📇",
                color: "#2C3E50",
                href: "/contacts",
              },
              { label: "Sales", icon: "📈", color: "#27AE60", href: "/sales" },
              {
                label: "Purchase",
                icon: "🛒",
                color: "#8E44AD",
                href: "/purchase",
              },
              {
                label: "Mfg",
                icon: "🏭",
                color: "#D35400",
                href: "/manufacturing",
              },
              { label: "Chat", icon: "💬", color: "#3498DB", href: "/chat" },
              {
                label: "Projects",
                icon: "📋",
                color: "#9B59B6",
                href: "/projects",
              },
              { label: "Docs", icon: "📄", color: "#2ECC71", href: "/docs" },
              {
                label: "Ops / ERP",
                icon: "📦",
                color: "#F39C12",
                href: "/ops",
              },
              {
                label: "Finance",
                icon: "💰",
                color: "#1ABC9C",
                href: "/finance",
              },
              { label: "CRM", icon: "🎯", color: "#E67E22", href: "/crm" },
              { label: "HR", icon: "👥", color: "#3498DB", href: "/hr" },
              {
                label: "Expenses",
                icon: "🧾",
                color: "#95A5A6",
                href: "/expenses",
              },
              { label: "Code", icon: "⌨️", color: "#8E44AD", href: "/code" },
              {
                label: "Observe",
                icon: "📊",
                color: "#E74C3C",
                href: "/observe",
              },
              { label: "AI", icon: "🧠", color: "#06B6D4", href: "/ai" },
              {
                label: "Automations",
                icon: "⚡",
                color: "#F1C40F",
                href: "/automations",
              },
              {
                label: "Roadmap",
                icon: "🗺️",
                color: "#1ABC9C",
                href: "/roadmap",
              },
              {
                label: "Invoicing",
                icon: "📑",
                color: "#2ECC71",
                href: "/invoicing",
              },
              {
                label: "Maintenance",
                icon: "🔧",
                color: "#E67E22",
                href: "/maintenance",
              },
              {
                label: "Marketing",
                icon: "📣",
                color: "#E91E63",
                href: "/marketing",
              },
              {
                label: "Reporting",
                icon: "📊",
                color: "#607D8B",
                href: "/reporting",
              },
              {
                label: "Settings",
                icon: "⚙️",
                color: "#7F8C8D",
                href: "/settings",
              },
              { label: "Admin", icon: "🛡️", color: "#2C3E50", href: "/admin" },
            ].map((mod) => (
              <button
                key={mod.href}
                onClick={() => router.push(mod.href)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 8px",
                  borderRadius: 12,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    `rgba(${mod.color === "#06B6D4" ? "108,71,255" : "0,0,0"}, 0.04)`;
                  (e.currentTarget as HTMLElement).style.borderColor =
                    mod.color;
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--content-bg)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--content-border)";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${mod.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  {mod.icon}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {mod.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* AI Alert Card */}
        <section
          aria-label="Active incident alert"
          style={{
            background: "var(--alert-purple-bg)",
            border: "1px solid var(--alert-purple-border)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <VyneLogo variant="mark" markSize={20} />
            <h2
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--alert-purple-text)",
                margin: 0,
              }}
            >
              Vyne AI — Active Incident
            </h2>
            <span
              aria-label="Live incident"
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--vyne-purple)",
                background: "rgba(6, 182, 212,0.12)",
                padding: "2px 6px",
                borderRadius: 4,
                letterSpacing: "0.05em",
              }}
            >
              LIVE
            </span>
            <span
              style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-tertiary)" }}
            >
              2:14 PM · 7 min ago
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              lineHeight: 1.65,
              marginBottom: 12,
            }}
          >
            <code
              style={{
                background: "rgba(6, 182, 212,0.12)",
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              api-service v2.4.1
            </code>{" "}
            deployment failed at 2:14 PM due to a missing IAM permission.{" "}
            <strong>47 orders</strong> are currently stuck in
            &quot;processing&quot; — estimated revenue at risk:{" "}
            <strong style={{ color: "var(--status-danger)" }}>$12,400</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={{
                background: "var(--vyne-purple)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={() => router.push("/observe")}
            >
              🔄 Execute Rollback
            </button>
            <button
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={() => router.push("/observe")}
            >
              View Metrics
            </button>
            <button
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={() => router.push("/chat")}
            >
              Open #alerts
            </button>
          </div>
        </section>

        {/* Stats grid */}
        <section aria-label="Key metrics">
          <VisuallyHidden as="h2">Key Metrics</VisuallyHidden>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {STAT_CARDS.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                delta={s.delta}
                deltaColor={s.deltaColor}
              />
            ))}
          </div>
        </section>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,280px)",
            gap: 14,
          }}
        >
          {/* Left column */}
          <div>
            {/* Recent Activity */}
            <section
              aria-label="Recent activity"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Recent Activity
                </h2>
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  View all
                </button>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {RECENT_ACTIVITY.map((a) => (
                  <ActivityItem
                    key={a.name + a.time}
                    avatar={a.avatar}
                    name={a.name}
                    avatarBg={a.avatarBg}
                    action={a.action}
                    time={a.time}
                  />
                ))}
              </div>
            </section>

            {/* Sprint progress */}
            <section
              aria-label="Sprint progress"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 14px 0",
                }}
              >
                Sprint 12 — Progress
              </h2>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  27 / 35 points complete
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--vyne-purple)",
                  }}
                >
                  77%
                </span>
              </div>
              <progress
                value={77}
                max={100}
                aria-label="Sprint 12 progress: 77%"
                style={{
                  height: 4,
                  width: "100%",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 16,
                  appearance: "none",
                  WebkitAppearance: "none",
                  border: "none",
                  background: "var(--content-bg-secondary)",
                  accentColor: "#06B6D4",
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SPRINT_BADGES.map(({ label, bg, color }) => (
                  <span
                    key={label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 500,
                      background: bg,
                      color,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* My Focus Today */}
            <section
              aria-label="My focus today"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 12px 0",
                }}
              >
                My Focus Today
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FOCUS_TASKS.map(({ task, meta }) => (
                  <div
                    key={task}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label={task}
                      style={{
                        marginTop: 2,
                        accentColor: "#06B6D4",
                        cursor: "pointer",
                      }}
                    />
                    <div>
                      <div
                        style={{ fontSize: 12, color: "var(--text-primary)" }}
                      >
                        {task}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 1,
                        }}
                      >
                        {meta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ask Vyne AI */}
            <section
              aria-label="Ask Vyne AI"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 12px 0",
                }}
              >
                Ask Vyne AI
              </h2>
              <div
                style={{
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Recent queries
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  {AI_RECENT_QUERIES.map((q) => (
                    <button
                      key={q}
                      style={{
                        background: "var(--content-bg)",
                        border: "1px solid var(--content-border)",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.1s",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <button
                style={{
                  width: "100%",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ⌘ Ask anything (⌘K)
              </button>
            </section>

            {/* Quick Actions */}
            <section
              aria-label="Quick actions"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 12px 0",
                }}
              >
                Quick Actions
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 7,
                }}
              >
                {QUICK_ACTIONS.map(({ label, route }) => (
                  <button
                    key={label}
                    onClick={() => router.push(route)}
                    style={{
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--content-border)",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
