"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Mail,
  User,
  DollarSign,
  Target,
  Tag,
  Clock,
  Sparkles,
} from "lucide-react";
import { useDealById, useCRMStore } from "@/lib/stores/crm";
import { useCustomFieldsStore } from "@/lib/stores/customFields";
import { CustomFieldsList } from "@/components/shared/CustomFieldsRenderer";
import { undoableDelete } from "@/lib/undo";
import toast from "react-hot-toast";

function stageBg(stage: string): string {
  const map: Record<string, string> = {
    Lead: "rgba(148,144,184,0.15)",
    Qualified: "rgba(59,130,246,0.15)",
    Proposal: "rgba(245,158,11,0.15)",
    Negotiation: "rgba(139,92,246,0.15)",
    Won: "rgba(34,197,94,0.15)",
    Lost: "rgba(239,68,68,0.15)",
  };
  return map[stage] ?? "rgba(148,144,184,0.15)";
}
function stageColor(stage: string): string {
  const map: Record<string, string> = {
    Lead: "var(--text-secondary)",
    Qualified: "var(--status-info)",
    Proposal: "var(--status-warning)",
    Negotiation: "#8B5CF6",
    Won: "var(--status-success)",
    Lost: "var(--status-danger)",
  };
  return map[stage] ?? "var(--text-secondary)";
}

export default function DealDetailPage() {
  const params = useParams<{ dealId: string }>();
  const router = useRouter();
  const dealId = params?.dealId as string;
  const deal = useDealById(dealId);
  const deleteDeal = useCRMStore((s) => s.deleteDeal);
  const customFields =
    useCustomFieldsStore((s) => s.schemas["crm"]?.fields) ?? [];

  if (!deal) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          Deal not found.
        </p>
        <Link
          href="/crm"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to CRM
        </Link>
      </div>
    );
  }

  function handleDelete() {
    if (!confirm(`Delete deal "${deal!.company}"? You'll have 5 seconds to undo.`))
      return;
    const snapshot = { ...deal! };
    undoableDelete({
      label: `Deleted deal — ${snapshot.company}`,
      mutate: () => deleteDeal(snapshot.id),
      restore: () => useCRMStore.getState().addDeal(snapshot),
    });
    router.push("/crm");
  }

  const fields: { icon: typeof Building2; label: string; value: string }[] = [
    { icon: Building2, label: "Company", value: deal.company },
    { icon: User, label: "Contact", value: deal.contactName },
    { icon: Mail, label: "Email", value: deal.email || "—" },
    {
      icon: DollarSign,
      label: "Value",
      value: `$${deal.value.toLocaleString()}`,
    },
    { icon: Target, label: "Stage", value: deal.stage },
    { icon: Tag, label: "Source", value: deal.source },
    { icon: User, label: "Assignee", value: deal.assignee },
    {
      icon: Clock,
      label: "Last activity",
      value: new Date(deal.lastActivity).toLocaleDateString(),
    },
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg-secondary)" }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--content-bg)",
          borderBottom: "1px solid var(--content-border)",
          padding: "16px 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 10,
          }}
        >
          <Link
            href="/crm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--text-secondary)",
            }}
          >
            <ArrowLeft size={13} /> Back
          </Link>
          <span
            style={{
              width: 1,
              height: 12,
              background: "var(--content-border)",
              margin: "0 6px",
            }}
          />
          <Link href="/crm" style={{ color: "var(--text-secondary)" }}>
            CRM
          </Link>
          <span style={{ margin: "0 4px" }}>›</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {deal.company}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              {deal.company}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                background: stageBg(deal.stage),
                color: stageColor(deal.stage),
              }}
            >
              {deal.stage}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={`/crm/deals/${deal.id}/edit`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
              }}
            >
              <Pencil size={13} /> Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--status-danger)",
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.06)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: 28 }}
      >
        <div
          className="two-pane-layout"
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Left: details */}
          <div>
            <section
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 14,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 16,
                  letterSpacing: "-0.01em",
                }}
              >
                Details
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                {fields.map((f) => (
                  <div key={f.label}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-tertiary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      <f.icon size={11} />
                      {f.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <DealAIInsights deal={deal} />

            {deal.notes && (
              <section
                style={{
                  background: "var(--content-bg)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 14,
                  padding: 24,
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 12,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Notes
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {deal.notes}
                </p>
              </section>
            )}

            {customFields.length > 0 && (
              <section
                style={{
                  background: "var(--content-bg)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 14,
                  padding: 24,
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 12,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Custom fields
                </h2>
                <CustomFieldsList
                  fields={customFields}
                  values={deal.customFields}
                />
              </section>
            )}
          </div>

          {/* Right: stats */}
          <aside style={{ position: "sticky", top: 24 }}>
            <div
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                Deal value
              </h3>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  marginBottom: 6,
                }}
              >
                ${deal.value.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginBottom: 16,
                }}
              >
                {deal.probability}% probability
              </div>
              <div
                style={{
                  height: 1,
                  background: "var(--content-border)",
                  margin: "16px 0",
                }}
              />
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 6,
                }}
              >
                Weighted value
              </h3>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--vyne-accent, var(--vyne-purple))",
                }}
              >
                $
                {Math.round(
                  (deal.value * deal.probability) / 100,
                ).toLocaleString()}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── DealAIInsights ──────────────────────────────────────────────
// Two AI buttons: "Why is this stalled?" (uses last-activity timestamp
// + stage age) and "Next best action" (suggests email/meeting/move).
// Results render inline in a tinted card. Cached per (dealId, day) so
// repeated visits don't burn tokens.

interface DealLite {
  id: string;
  company: string;
  contactName: string;
  email: string;
  stage: string;
  value: number;
  probability: number;
  assignee: string;
  lastActivity: string;
  nextAction: string;
  source: string;
  notes: string;
}

function DealAIInsights({ deal }: { deal: DealLite }) {
  const [stalled, setStalled] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loadingKind, setLoadingKind] = useState<"stalled" | "next" | null>(null);

  const daysSinceActivity = Math.max(
    0,
    Math.round((Date.now() - new Date(deal.lastActivity).getTime()) / 86400000),
  );

  async function ask(kind: "stalled" | "next") {
    const cacheKey = `vyne-deal-ai-${kind}-${deal.id}-${new Date().toISOString().slice(0, 10)}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        if (kind === "stalled") setStalled(cached);
        else setNext(cached);
        return;
      }
    } catch {
      // ignore
    }

    setLoadingKind(kind);
    try {
      const question =
        kind === "stalled"
          ? `In one short paragraph (3 sentences max), diagnose why this deal is stalled. Be specific — reference stage, days since last activity (${daysSinceActivity}d), and the next-action note. No marketing fluff.`
          : `Recommend the single most useful next action to advance this deal in the next 48h. One short paragraph (3 sentences max). Be concrete: name the channel (email / call / in-person), give a one-line script if it's an email, and a sensible date if it's a meeting.`;
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: { deals: [deal] },
        }),
      });
      const body = (await res.json()) as { answer?: string };
      const text = (body.answer ?? "").trim();
      if (!text) {
        toast.error("AI didn't return a response.");
        return;
      }
      if (kind === "stalled") setStalled(text);
      else setNext(text);
      try {
        localStorage.setItem(cacheKey, text);
      } catch {
        // ignore
      }
    } catch (err) {
      toast.error("Couldn't reach AI: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setLoadingKind(null);
    }
  }

  return (
    <section
      style={{
        background: "var(--vyne-accent-soft, var(--content-bg))",
        border: "1px solid var(--vyne-accent-ring, var(--content-border))",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--vyne-accent, #5B5BD6)",
            color: "#fff",
          }}
        >
          <Sparkles size={13} />
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Vyne AI insights
        </h2>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: stalled || next ? 10 : 0 }}>
        <button
          type="button"
          onClick={() => ask("stalled")}
          disabled={loadingKind !== null}
          aria-busy={loadingKind === "stalled"}
          style={aiBtnStyle}
        >
          {loadingKind === "stalled" ? "Diagnosing…" : "Why is this stalled?"}
        </button>
        <button
          type="button"
          onClick={() => ask("next")}
          disabled={loadingKind !== null}
          aria-busy={loadingKind === "next"}
          style={aiBtnStyle}
        >
          {loadingKind === "next" ? "Thinking…" : "Next best action"}
        </button>
      </div>
      {stalled && (
        <div style={aiOutStyle}>
          <strong style={{ display: "block", marginBottom: 4, color: "var(--text-primary)" }}>
            Why stalled
          </strong>
          {stalled}
        </div>
      )}
      {next && (
        <div style={{ ...aiOutStyle, marginTop: stalled ? 8 : 0 }}>
          <strong style={{ display: "block", marginBottom: 4, color: "var(--text-primary)" }}>
            Suggested next move
          </strong>
          {next}
        </div>
      )}
    </section>
  );
}

const aiBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid var(--vyne-accent-ring, var(--content-border))",
  background: "var(--content-bg)",
  color: "var(--vyne-accent-deep, var(--text-primary))",
  cursor: "pointer",
};
const aiOutStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
  whiteSpace: "pre-wrap",
};
