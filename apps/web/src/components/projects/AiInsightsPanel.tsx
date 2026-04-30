"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Tag,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Workflow,
  Calendar,
  FileText,
  Bell,
  RefreshCw,
} from "lucide-react";

interface IssueInput {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  recentComments?: string[];
  knownTags?: string[];
}

interface TagSuggestion {
  category: string;
  tags: string[];
  priority: "urgent" | "high" | "medium" | "low";
  rationale: string;
}

interface NextAction {
  id: string;
  label: string;
  rationale: string;
  type: "comment" | "assign" | "status" | "meet" | "doc" | "notify";
}

interface Props {
  issue: IssueInput;
  /** Called when the user clicks "Apply" on a tag suggestion. */
  onApplyTags?: (tags: string[]) => void;
  /** Called when the user clicks "Apply" on a category suggestion. */
  onApplyCategory?: (category: string) => void;
  /** Called when an action is invoked. Component will pass the action; caller decides what to do. */
  onAction?: (action: NextAction) => void;
}

const ACTION_ICON: Record<NextAction["type"], React.ElementType> = {
  comment: MessageSquare,
  assign: UserPlus,
  status: Workflow,
  meet: Calendar,
  doc: FileText,
  notify: Bell,
};

export function AiInsightsPanel({
  issue,
  onApplyTags,
  onApplyCategory,
  onAction,
}: Props) {
  const [tagSuggestion, setTagSuggestion] = useState<TagSuggestion | null>(null);
  const [actions, setActions] = useState<NextAction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set());
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tagRes, actRes] = await Promise.all([
        fetch("/api/ai/tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: issue.title,
            description: issue.description,
            knownTags: issue.knownTags,
          }),
        }),
        fetch("/api/ai/next-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            assignee: issue.assignee,
            recentComments: issue.recentComments,
          }),
        }),
      ]);
      const tagData = (await tagRes.json()) as {
        suggestion: TagSuggestion;
        provider: string;
      };
      const actData = (await actRes.json()) as {
        suggestion: { actions: NextAction[] };
        provider: string;
      };
      setTagSuggestion(tagData.suggestion);
      setActions(actData.suggestion.actions);
      setProvider(tagData.provider);
    } catch {
      // swallow — empty state will render
    } finally {
      setLoading(false);
    }
  }, [
    issue.title,
    issue.description,
    issue.status,
    issue.priority,
    issue.assignee,
    issue.knownTags,
    issue.recentComments,
  ]);

  // Auto-load on first mount per issue id
  useEffect(() => {
    void refresh();
    setAppliedTags(new Set());
    setAppliedActions(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue.id]);

  const applyAllTags = () => {
    if (!tagSuggestion) return;
    onApplyTags?.(tagSuggestion.tags);
    setAppliedTags(new Set(tagSuggestion.tags));
  };

  return (
    <section
      aria-label="Vyne AI insights"
      style={{
        border: "1px solid var(--alert-purple-border)",
        borderRadius: 12,
        background: "var(--alert-purple-bg)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Sparkles size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Vyne AI insights
        </span>
        {provider && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              padding: "1px 6px",
              borderRadius: 999,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            {provider}
          </span>
        )}
        <button
          type="button"
          aria-label="Refresh AI insights"
          onClick={refresh}
          disabled={loading} aria-busy={loading}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            background: "var(--content-bg)",
            color: "var(--vyne-accent, var(--vyne-purple))",
            fontSize: 11,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: loading ? "vyne-spin 1s linear infinite" : "none",
            }}
          />
          {loading ? "Thinking…" : "Refresh"}
        </button>
        <style>{`@keyframes vyne-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </header>

      {/* Tag suggestions */}
      {tagSuggestion && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Tag size={12} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Suggested category & tags
            </span>
            <button
              type="button"
              onClick={applyAllTags}
              style={{
                marginLeft: "auto",
                padding: "3px 8px",
                borderRadius: 6,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Apply all
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => onApplyCategory?.(tagSuggestion.category)}
              title={`Apply category: ${tagSuggestion.category}`}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              📂 {tagSuggestion.category}
            </button>
            {tagSuggestion.tags.map((t) => {
              const applied = appliedTags.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onApplyTags?.([t]);
                    setAppliedTags((prev) => {
                      const next = new Set(prev);
                      next.add(t);
                      return next;
                    });
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 9px",
                    borderRadius: 999,
                    background: applied
                      ? "var(--badge-success-bg)"
                      : "var(--content-bg)",
                    border: `1px solid ${applied ? "var(--badge-success-text)" : "var(--content-border)"}`,
                    color: applied
                      ? "var(--badge-success-text)"
                      : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {applied && <CheckCircle2 size={10} />}#{t}
                </button>
              );
            })}
            <span
              title="AI-suggested priority"
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 999,
                background:
                  tagSuggestion.priority === "urgent"
                    ? "var(--badge-danger-bg)"
                    : tagSuggestion.priority === "high"
                      ? "var(--badge-warning-bg)"
                      : "var(--content-bg)",
                color:
                  tagSuggestion.priority === "urgent"
                    ? "var(--badge-danger-text)"
                    : tagSuggestion.priority === "high"
                      ? "var(--badge-warning-text)"
                      : "var(--text-secondary)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {tagSuggestion.priority} priority
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontStyle: "italic",
              margin: "6px 0 0",
            }}
          >
            {tagSuggestion.rationale}
          </p>
        </div>
      )}

      {/* Next actions */}
      {actions && actions.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Suggested next actions
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {actions.map((a) => {
              const Icon = ACTION_ICON[a.type] ?? MessageSquare;
              const done = appliedActions.has(a.id);
              return (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 10,
                    borderRadius: 8,
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    opacity: done ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
                      color: "var(--vyne-accent, var(--vyne-purple))",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {a.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 1,
                      }}
                    >
                      {a.rationale}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAction?.(a);
                      setAppliedActions((prev) => {
                        const next = new Set(prev);
                        next.add(a.id);
                        return next;
                      });
                    }}
                    disabled={done}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: done
                        ? "var(--badge-success-bg)"
                        : "var(--vyne-accent, var(--vyne-purple))",
                      color: done ? "var(--badge-success-text)" : "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: done ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {done ? "Done" : "Apply"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!loading && !tagSuggestion && !actions && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            margin: 0,
            textAlign: "center",
          }}
        >
          No suggestions yet — click Refresh.
        </p>
      )}
    </section>
  );
}
