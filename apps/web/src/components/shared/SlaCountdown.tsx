"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

/**
 * SlaCountdown — inline banner that surfaces "X hours left to meet SLA"
 * with green / amber / red colour bands. Drops onto any record header
 * that has a target due date.
 *
 *   <SlaCountdown
 *     targetIso={invoice.dueDate}
 *     amberHours={24}
 *     redHours={4}
 *     label="Pay-by SLA"
 *   />
 *
 * The component re-renders every 30 s so the countdown stays live
 * without DOM churn between ticks. Past due is "Breached · Xh ago".
 */
export interface SlaCountdownProps {
  /** ISO timestamp of the SLA target. */
  targetIso: string;
  /** Threshold (hours from target) below which the banner turns amber.
   *  Default 24. */
  amberHours?: number;
  /** Threshold (hours from target) below which the banner turns red.
   *  Default 4. */
  redHours?: number;
  /** Short label rendered before the countdown. e.g. "Reply SLA". */
  label?: string;
  /** Hides the banner entirely once breached for more than `hideAfterHours`. */
  hideAfterHours?: number;
  /** Optional click target (e.g. open the linked record). */
  href?: string;
}

const TICK_MS = 30_000;

function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const sec = Math.round(abs / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  const days = Math.round(hr / 24);
  return `${days}d`;
}

export function SlaCountdown({
  targetIso,
  amberHours = 24,
  redHours = 4,
  label = "SLA",
  hideAfterHours,
  href,
}: SlaCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const { state, msRemaining, target } = useMemo(() => {
    const target = new Date(targetIso).getTime();
    const ms = target - now;
    const hours = ms / 3_600_000;
    let state: "ok" | "warning" | "danger" | "breached" = "ok";
    if (ms <= 0) state = "breached";
    else if (hours <= redHours) state = "danger";
    else if (hours <= amberHours) state = "warning";
    return { state, msRemaining: ms, target };
  }, [now, targetIso, amberHours, redHours]);

  if (
    state === "breached" &&
    hideAfterHours !== undefined &&
    Math.abs(msRemaining) > hideAfterHours * 3_600_000
  ) {
    return null;
  }

  const palette =
    state === "danger" || state === "breached"
      ? {
          bg: "rgba(239,68,68,0.10)",
          border: "var(--status-danger, #EF4444)",
          color: "var(--status-danger, #EF4444)",
        }
      : state === "warning"
        ? {
            bg: "rgba(245,158,11,0.12)",
            border: "var(--status-warning, #F59E0B)",
            color: "var(--status-warning, #F59E0B)",
          }
        : {
            bg: "rgba(34,197,94,0.10)",
            border: "var(--status-success, #22C55E)",
            color: "var(--status-success, #22C55E)",
          };

  const Icon = state === "breached" || state === "danger" ? AlertTriangle : Clock;
  const text =
    state === "breached"
      ? `${label} breached · ${formatRemaining(msRemaining)} ago`
      : `${label} · ${formatRemaining(msRemaining)} left`;

  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      role={state === "breached" || state === "danger" ? "alert" : "status"}
      aria-live={state === "breached" || state === "danger" ? "assertive" : "polite"}
      title={`Target: ${new Date(target).toLocaleString()}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 11,
        fontWeight: 600,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} />
      {text}
    </Wrapper>
  );
}
