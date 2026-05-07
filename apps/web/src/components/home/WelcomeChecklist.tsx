"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Palette,
  UserPlus,
  CreditCard,
  Upload,
  Briefcase,
  ListChecks,
  Sparkles,
  Bell,
  Bookmark,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  useSetupScore,
  type SetupRoleId,
} from "@/lib/stores/setupScore";

// Re-declared locally so the component file doesn't depend on the
// store's non-exported step list. These mirror the seed in setupScore.ts.
const _STEPS_REF: Array<{
  id: string;
  title: string;
  description: string;
  href?: string;
  weight: number;
  role: SetupRoleId;
  icon: string;
  durationMin?: number;
  group: "Workspace" | "Connect data" | "Invite & share" | "Try it";
}> = [
  { id: "create-workspace", title: "Create your workspace", description: "Name it, pick a colour, set a logo.", href: "/settings?panel=general", weight: 1, role: "any", icon: "Building2", durationMin: 1, group: "Workspace" },
  { id: "set-theme", title: "Pick an accent colour", description: "85 swatches or any hex; cascades across the whole UI.", href: "/settings?panel=appearance", weight: 1, role: "any", icon: "Palette", durationMin: 1, group: "Workspace" },
  { id: "invite-team", title: "Invite a teammate", description: "Even one helper makes Cmd+K + presence + chat tangible.", href: "/settings?panel=members", weight: 2, role: "admin", icon: "UserPlus", durationMin: 2, group: "Invite & share" },
  { id: "connect-stripe", title: "Connect Stripe (or skip)", description: "Powers invoice payment links; Stripe-test works in demo.", href: "/settings?panel=integrations", weight: 2, role: "any", icon: "CreditCard", durationMin: 3, group: "Connect data" },
  { id: "import-csv", title: "Import contacts from CSV", description: "AI maps columns; preview before commit.", href: "/contacts?import=1", weight: 1, role: "any", icon: "Upload", durationMin: 3, group: "Connect data" },
  { id: "create-deal", title: "Add your first deal", description: "Or sample-load one — deal coach + AI work the same either way.", href: "/crm", weight: 1, role: "sales", icon: "Briefcase", durationMin: 1, group: "Try it" },
  { id: "create-project", title: "Spin up a project", description: "Board view, sprint planner, and the AI sprint planner all wake up.", href: "/projects", weight: 1, role: "engineer", icon: "ListChecks", durationMin: 2, group: "Try it" },
  { id: "use-ai", title: "Ask Vyne AI a question", description: "Try “what changed in projects this week?”", href: "/ai/chat", weight: 2, role: "any", icon: "Sparkles", durationMin: 1, group: "Try it" },
  { id: "enable-push", title: "Turn on web push", description: "Stay in the loop without keeping the tab open.", href: "/settings?panel=notifications", weight: 1, role: "any", icon: "Bell", durationMin: 1, group: "Workspace" },
  { id: "save-view", title: "Save your first view", description: "Pin a filter combo on any list page (CRM, projects, ops…).", href: "/crm", weight: 1, role: "any", icon: "Bookmark", durationMin: 1, group: "Try it" },
];

function applicable(role: SetupRoleId, stepRole: SetupRoleId): boolean {
  return stepRole === "any" || role === "any" || stepRole === role;
}

/**
 * WelcomeChecklist — gamified setup card on the home page. Renders:
 *   - a 0-100 score gauge with confetti at 100
 *   - the next-up step pinned at the top
 *   - all remaining steps grouped (Workspace / Connect data / Invite & share / Try it)
 *   - per-row "Done" / "Skip" / "Open" actions
 *
 * Reads from `useSetupScore` so any module that flips a step (CSV
 * import → markSetupStep("import-csv")) updates the gauge live.
 */

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Building2,
  Palette,
  UserPlus,
  CreditCard,
  Upload,
  Briefcase,
  ListChecks,
  Sparkles,
  Bell,
  Bookmark,
};

export function WelcomeChecklist({
  role = "any",
}: {
  role?: SetupRoleId;
}) {
  // Subscribe to the stable `records` map only; derive everything else
  // with useMemo so React 19's useSyncExternalStore consistency check
  // doesn't trip on a fresh array per render (Minified React error #185).
  const records = useSetupScore((s) => s.records);
  const markDone = useSetupScore((s) => s.markDone);
  const dismiss = useSetupScore((s) => s.dismiss);
  const reset = useSetupScore((s) => s.reset);

  const allSteps = useMemo(
    () =>
      _STEPS_REF.filter((s) => applicable(role, s.role)).map((s) => ({
        ...s,
        ...(records[s.id] ?? { done: false }),
      })),
    [records, role],
  );

  const score = useMemo(() => {
    const items = _STEPS_REF.filter((s) => applicable(role, s.role));
    if (items.length === 0) return 0;
    const total = items.reduce((sum, s) => sum + s.weight, 0);
    const earned = items.reduce((sum, s) => {
      const r = records[s.id];
      if (r?.done || r?.dismissed) return sum + s.weight;
      return sum;
    }, 0);
    return Math.round((earned / total) * 100);
  }, [records, role]);

  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Group + ordering: not-done-not-dismissed first, then done-or-dismissed.
  const groups = useMemo(() => {
    const out: Record<string, typeof allSteps> = {
      Workspace: [],
      "Connect data": [],
      "Invite & share": [],
      "Try it": [],
    };
    for (const s of allSteps) out[s.group].push(s);
    return out;
  }, [allSteps]);

  const nextStep = useMemo(
    () => allSteps.find((s) => !s.done && !s.dismissed) ?? null,
    [allSteps],
  );

  if (hidden) return null;

  // Persist hidden state across sessions once the user dismisses the
  // 100% card.
  return (
    <section
      aria-label="Welcome checklist"
      data-vyne-welcome-checklist
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
      }}
    >
      {/* Header row: gauge + label + collapse */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Gauge value={score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {score === 100 ? (
              <>
                <Trophy size={14} style={{ color: "#F59E0B" }} />
                Workspace ready
              </>
            ) : (
              "Get started"
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                background: "var(--content-secondary)",
                padding: "1px 7px",
                borderRadius: 999,
              }}
            >
              {score}%
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-tertiary)",
              lineHeight: 1.4,
            }}
          >
            {score === 100
              ? "Every recommended step is done. You can dismiss this card."
              : nextStep
                ? `Next up: ${nextStep.title}`
                : "Pick any task below to keep going."}
          </p>
        </div>
        {score === 100 && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Dismiss checklist"
            style={iconBtnStyle}
          >
            <X size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          style={iconBtnStyle}
        >
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
        {score > 0 && (
          <button
            type="button"
            onClick={reset}
            aria-label="Reset progress"
            title="Reset checklist progress"
            style={iconBtnStyle}
          >
            <RotateCcw size={13} />
          </button>
        )}
      </header>

      {/* Body */}
      {!collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Pinned next-step card */}
          {nextStep && (
            <Row
              step={nextStep}
              pinned
              onDone={() => markDone(nextStep.id)}
              onDismiss={() => dismiss(nextStep.id)}
              icon={ICON_MAP[nextStep.icon] ?? Building2}
            />
          )}

          {/* Sectioned remaining steps */}
          {Object.entries(groups).map(([group, items]) => {
            const visible = items.filter((s) => s.id !== nextStep?.id);
            if (!visible.length) return null;
            return (
              <div key={group}>
                <header
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 6,
                  }}
                >
                  {group}
                </header>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {visible.map((step) => (
                    <li key={step.id}>
                      <Row
                        step={step}
                        onDone={() => markDone(step.id)}
                        onDismiss={() => dismiss(step.id)}
                        icon={ICON_MAP[step.icon] ?? Building2}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface RowStep {
  id: string;
  title: string;
  description: string;
  href?: string;
  durationMin?: number;
  done?: boolean;
  dismissed?: boolean;
}

function Row({
  step,
  pinned,
  onDone,
  onDismiss,
  icon: Icon,
}: {
  step: RowStep;
  pinned?: boolean;
  onDone: () => void;
  onDismiss: () => void;
  icon: React.ComponentType<{ size?: number }>;
}) {
  const isComplete = step.done || step.dismissed;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: pinned ? "10px 12px" : "8px 10px",
        borderRadius: pinned ? 10 : 8,
        border: pinned
          ? "1px solid var(--vyne-accent, var(--vyne-purple))"
          : "1px solid var(--content-border)",
        background: pinned
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
          : isComplete
            ? "transparent"
            : "var(--content-secondary)",
        opacity: isComplete ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={step.done ? "true" : "false"}
        aria-label={step.done ? "Mark not done" : "Mark done"}
        onClick={onDone}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: step.done
            ? "none"
            : "1.5px solid var(--content-border)",
          background: step.done
            ? "var(--vyne-accent, var(--vyne-purple))"
            : "transparent",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {step.done && <Check size={11} strokeWidth={3} />}
      </button>
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: "var(--content-bg)",
          color: "var(--text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={12} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: pinned ? 600 : 500,
            color: "var(--text-primary)",
            textDecoration: step.done ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {step.title}
          {step.dismissed && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontWeight: 600,
              }}
            >
              · skipped
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {step.description}
        </div>
      </div>
      {step.durationMin && !isComplete && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            padding: "1px 7px",
            borderRadius: 999,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            flexShrink: 0,
          }}
        >
          {step.durationMin}m
        </span>
      )}
      {step.href && !isComplete && (
        <Link
          href={step.href}
          aria-label={`Open: ${step.title}`}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: pinned ? "none" : "1px solid var(--content-border)",
            background: pinned
              ? "var(--vyne-accent, var(--vyne-purple))"
              : "var(--content-bg)",
            color: pinned ? "#fff" : "var(--text-primary)",
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {pinned ? "Open" : "Open"}
        </Link>
      )}
      {!step.done && !step.dismissed && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Skip this step"
          title="Skip"
          style={iconBtnStyle}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(Math.max(value, 0), 100) / 100);
  const colour =
    value >= 100
      ? "#F59E0B"
      : value >= 70
        ? "#22C55E"
        : value >= 30
          ? "var(--vyne-accent, var(--vyne-purple))"
          : "var(--text-tertiary)";
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      role="img"
      aria-label={`Setup score ${value}%`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="26"
        cy="26"
        r={radius}
        fill="none"
        stroke="var(--content-border)"
        strokeWidth="4"
      />
      <circle
        cx="26"
        cy="26"
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 600ms ease, stroke 200ms" }}
      />
      <text
        x="26"
        y="26"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 11,
          fontWeight: 700,
          fill: "var(--text-primary)",
          fontFamily: "var(--font-app, inherit)",
        }}
      >
        {value}%
      </text>
    </svg>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
};
