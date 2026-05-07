"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  RotateCcw,
  Briefcase,
  User,
  ListChecks,
  Receipt,
  Box,
  FileText,
  Bot,
  Workflow,
  ShieldX,
} from "lucide-react";
import {
  useTrashStore,
  type TrashEntity,
} from "@/lib/stores/trash";

interface Props {
  onToast: (message: string) => void;
}

const ENTITY_ICONS: Record<TrashEntity, React.ComponentType<{ size?: number }>> = {
  deal: Briefcase,
  contact: User,
  task: ListChecks,
  project: ListChecks,
  invoice: Receipt,
  product: Box,
  order: Box,
  doc: FileText,
  automation: Bot,
  playbook: Workflow,
  runbook: Workflow,
  other: Box,
};

const ENTITY_LABELS: Record<TrashEntity, string> = {
  deal: "Deal",
  contact: "Contact",
  task: "Task",
  project: "Project",
  invoice: "Invoice",
  product: "Product",
  order: "Order",
  doc: "Doc",
  automation: "Automation",
  playbook: "Playbook",
  runbook: "Runbook",
  other: "Item",
};

function relative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export default function TrashSettings({ onToast }: Props) {
  const items = useTrashStore((s) => s.items);
  const restoreFns = useTrashStore((s) => s._restoreFns);
  const restore = useTrashStore((s) => s.restore);
  const purge = useTrashStore((s) => s.purge);
  const purgeAll = useTrashStore((s) => s.purgeAll);
  const gc = useTrashStore((s) => s.gc);

  const [filter, setFilter] = useState<TrashEntity | "all">("all");

  // 30-day GC on mount.
  useEffect(() => {
    gc();
  }, [gc]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.entity === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const out: Partial<Record<TrashEntity, number>> = {};
    for (const i of items) out[i.entity] = (out[i.entity] ?? 0) + 1;
    return out;
  }, [items]);

  return (
    <div>
      <Card title="Trash & restore" icon={Trash2}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Items deleted in the last 30 days. Restore re-runs the original
          delete handler in reverse — items deleted in the current session
          restore in one click; older items still expose the snapshot.
        </p>

        {items.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter trash"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 12,
            }}
          >
            <Pill
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All ({items.length})
            </Pill>
            {(Object.keys(counts) as TrashEntity[]).map((k) => (
              <Pill
                key={k}
                active={filter === k}
                onClick={() => setFilter(k)}
              >
                {ENTITY_LABELS[k]} ({counts[k] ?? 0})
              </Pill>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div
            style={{
              padding: "30px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            <Trash2 size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Trash is empty</div>
            <div style={{ fontSize: 11 }}>
              Deleted records show up here for 30 days.
            </div>
          </div>
        ) : (
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
            {visible.map((item) => {
              const Icon = ENTITY_ICONS[item.entity] ?? Box;
              const canRestore = restoreFns.has(item.id);
              return (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "var(--content-secondary)",
                      color: "var(--text-secondary)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {ENTITY_LABELS[item.entity]} · trashed {relative(item.trashedAt)}
                      {item.actor ? ` by ${item.actor}` : ""}
                      {item.reason ? ` · ${item.reason}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = restore(item.id);
                      onToast(
                        ok
                          ? `Restored "${item.name}"`
                          : `Snapshot kept, but no live handler — open ${ENTITY_LABELS[item.entity]}s and re-create from the data.`,
                      );
                    }}
                    disabled={!canRestore}
                    style={{
                      ...primaryBtnStyle,
                      opacity: canRestore ? 1 : 0.5,
                      cursor: canRestore ? "pointer" : "default",
                    }}
                  >
                    <RotateCcw size={11} /> Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      purge(item.id);
                      onToast(`Purged "${item.name}" permanently`);
                    }}
                    aria-label="Purge permanently"
                    style={iconBtnStyle}
                  >
                    <ShieldX size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Permanently delete all ${items.length} item${items.length === 1 ? "" : "s"} in trash? This cannot be undone.`,
                )
              ) {
                purgeAll();
                onToast("Trash emptied");
              }
            }}
            style={{
              marginTop: 14,
              padding: "6px 14px",
              borderRadius: 7,
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.06)",
              color: "var(--status-danger, #DC2626)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Empty trash
          </button>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{title}</strong>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active ? "true" : "false"}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
        background: active
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
          : "var(--content-bg)",
        color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 12px",
  borderRadius: 6,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
};

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 4,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
