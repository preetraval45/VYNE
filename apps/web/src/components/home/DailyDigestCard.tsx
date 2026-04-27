"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useCalendarStore } from "@/lib/stores/calendar";
import { useSentMessagesStore } from "@/lib/stores/sentMessages";

interface DigestResponse {
  headline: string;
  summary: string;
  bullets: string[];
  callToAction: string;
}

const CACHE_KEY = "vyne-daily-digest-cache";

interface DigestCache {
  date: string; // YYYY-MM-DD
  data: DigestResponse;
}

/**
 * AI Daily Digest card. Renders at the top of the home dashboard:
 * pulls highlights from local stores (calendar events, recent
 * messages), asks Llama to write a 4-5 bullet recap, caches per-day
 * so it doesn't re-call on every render.
 */
export function DailyDigestCard() {
  const events = useCalendarStore((s) => s.events);
  const sent = useSentMessagesStore((s) => s.byChannel);
  const [data, setData] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(false);

  function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function buildHighlights(): string[] {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfDay.getDate() - 1);

    const todaysEvents = events.filter((e) => {
      const t = new Date(e.startsAt).getTime();
      return t >= startOfDay.getTime() && t < startOfDay.getTime() + 86400000;
    });
    const yesterdaysEvents = events.filter((e) => {
      const t = new Date(e.startsAt).getTime();
      return t >= startOfYesterday.getTime() && t < startOfDay.getTime();
    });
    const sentMessageCount = Object.values(sent).reduce(
      (a, list) => a + list.length,
      0,
    );

    const out: string[] = [];
    if (todaysEvents.length > 0) {
      out.push(
        `Today: ${todaysEvents.length} events scheduled — ${todaysEvents
          .slice(0, 3)
          .map((e) => e.title)
          .join(", ")}`,
      );
    }
    if (yesterdaysEvents.length > 0) {
      const calls = yesterdaysEvents.filter((e) => e.type === "call");
      const meetings = yesterdaysEvents.filter((e) => e.type === "meeting");
      out.push(
        `Yesterday: ${calls.length} customer calls + ${meetings.length} team meetings`,
      );
    }
    if (sentMessageCount > 0) {
      out.push(`${sentMessageCount} messages in your local history`);
    }
    // High-value scheduled items in the next 3 days
    const upcoming = events
      .filter(
        (e) =>
          new Date(e.startsAt).getTime() > Date.now() &&
          new Date(e.startsAt).getTime() < Date.now() + 3 * 86400000 &&
          e.attendees.length > 0,
      )
      .slice(0, 2);
    for (const ev of upcoming) {
      const when = new Date(ev.startsAt).toLocaleString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      out.push(
        `Upcoming: ${ev.title} — ${when} with ${ev.attendees
          .map((a) => a.name)
          .slice(0, 3)
          .join(", ")}`,
      );
    }
    if (out.length === 0) {
      out.push(
        "Quiet day — no scheduled events, light message volume",
      );
    }
    return out;
  }

  async function generateDigest(force = false) {
    setLoading(true);
    try {
      const today = todayKey();
      if (!force) {
        const cached = readCache();
        if (cached && cached.date === today) {
          setData(cached.data);
          return;
        }
      }
      const highlights = buildHighlights();
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "you", highlights }),
      });
      if (!res.ok) {
        return;
      }
      const json = (await res.json()) as DigestResponse;
      setData(json);
      writeCache({ date: today, data: json });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void generateDigest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        padding: 18,
        borderRadius: 14,
        background:
          "linear-gradient(135deg, rgba(108, 71, 255, 0.1), rgba(6, 182, 212, 0.06))",
        border: "1px solid rgba(108, 71, 255, 0.25)",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(108, 71, 255, 0.18)",
            color: "var(--vyne-purple)",
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
              fontSize: 10,
              fontWeight: 700,
              color: "var(--vyne-purple)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            VYNE AI · Daily digest
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.005em",
            }}
          >
            {data?.headline ?? (loading ? "Generating digest…" : "Today")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => generateDigest(true)}
          disabled={loading}
          aria-label="Refresh digest"
          title="Refresh"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid var(--content-border)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCw
            size={13}
            style={{
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </div>

      {data ? (
        <>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              margin: "0 0 12px",
            }}
          >
            {data.summary}
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 12px",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {data.bullets.map((b) => (
              <li
                key={b}
                style={{
                  fontSize: 12.5,
                  color: "var(--text-primary)",
                  paddingLeft: 14,
                  position: "relative",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 8,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--vyne-purple)",
                  }}
                />
                {b}
              </li>
            ))}
          </ul>
          {data.callToAction && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                fontSize: 12,
                color: "var(--text-primary)",
                lineHeight: 1.5,
              }}
            >
              <AlertCircle
                size={13}
                style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }}
              />
              <span>{data.callToAction}</span>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          {loading
            ? "Asking VYNE AI to summarize today…"
            : "Click refresh to generate today's digest."}
        </div>
      )}
      <style>
        {`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}
      </style>
    </motion.div>
  );
}

function readCache(): DigestCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DigestCache;
  } catch {
    return null;
  }
}

function writeCache(c: DigestCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // localStorage full or disabled
  }
}
