"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import type { IssueStatus, IssuePriority, User } from "@/types";
import { STATUS_META, PRIORITY_META } from "@/types";

// ─── Status Picker ───────────────────────────────────────────────

interface StatusPickerProps {
  value: IssueStatus;
  onChange: (value: IssueStatus) => void;
  compact?: boolean;
}

const STATUS_ORDER: IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export function StatusPicker({
  value,
  onChange,
  compact = false,
}: StatusPickerProps) {
  const meta = STATUS_META[value];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg transition-colors",
            compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs",
          )}
          style={{
            background: meta.bgColor,
            color: meta.color,
            border: `1px solid ${meta.color}30`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: meta.color }}
          />
          {!compact && <span className="font-medium">{meta.label}</span>}
          <ChevronDown size={10} className="flex-shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 rounded-xl py-1 min-w-[160px]"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            border: "1px solid var(--content-border)",
          }}
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
          >
            {STATUS_ORDER.map((status) => {
              const m = STATUS_META[status];
              const isSelected = value === status;
              return (
                <Popover.Close key={status} asChild>
                  <button
                    onClick={() => onChange(status)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{
                      background: isSelected ? m.bgColor : "transparent",
                      color: isSelected ? m.color : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        m.bgColor + "80")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        isSelected ? m.bgColor : "transparent")
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: m.color }}
                    />
                    <span className="flex-1 text-left font-medium">
                      {m.label}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color: m.color }} />
                    )}
                  </button>
                </Popover.Close>
              );
            })}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Priority Picker ─────────────────────────────────────────────

interface PriorityPickerProps {
  value: IssuePriority;
  onChange: (value: IssuePriority) => void;
  compact?: boolean;
}

const PRIORITY_ORDER: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "no_priority",
];

const PRIORITY_ICONS: Record<IssuePriority, React.ReactNode> = {
  urgent: (
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
      style={{ background: "#EF4444" }}
    />
  ),
  high: (
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
      style={{ background: "#F59E0B" }}
    />
  ),
  medium: (
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
      style={{ background: "#3B82F6" }}
    />
  ),
  low: (
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
      style={{ background: "var(--text-tertiary)" }}
    />
  ),
  no_priority: (
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0 inline-block border-2"
      style={{ background: "transparent", borderColor: "#D1D1E0" }}
    />
  ),
};

export function PriorityPicker({
  value,
  onChange,
  compact = false,
}: PriorityPickerProps) {
  const meta = PRIORITY_META[value];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg transition-colors",
            compact ? "p-1" : "px-2.5 py-1.5 text-xs",
            "hover:bg-[var(--content-bg-secondary)]",
          )}
          style={{ color: meta.color }}
          title={meta.label}
        >
          {PRIORITY_ICONS[value]}
          {!compact && (
            <span className="font-medium text-xs">{meta.label}</span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 rounded-xl py-1 min-w-[160px]"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            border: "1px solid var(--content-border)",
          }}
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
          >
            {PRIORITY_ORDER.map((priority) => {
              const m = PRIORITY_META[priority];
              const isSelected = value === priority;
              return (
                <Popover.Close key={priority} asChild>
                  <button
                    onClick={() => onChange(priority)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{
                      background: isSelected
                        ? "var(--content-bg-secondary)"
                        : "transparent",
                      color: isSelected ? m.color : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "var(--content-bg-secondary)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        isSelected
                          ? "var(--content-bg-secondary)"
                          : "transparent")
                    }
                  >
                    {PRIORITY_ICONS[priority]}
                    <span className="flex-1 text-left font-medium">
                      {m.label}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color: m.color }} />
                    )}
                  </button>
                </Popover.Close>
              );
            })}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Assignee Picker ─────────────────────────────────────────────

interface AssigneePickerProps {
  value?: string | null;
  users: User[];
  onChange: (userId: string | null) => void;
  compact?: boolean;
}

export function AssigneePicker({
  value,
  users,
  onChange,
  compact = false,
}: AssigneePickerProps) {
  const assignee = users.find((u) => u.id === value);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg transition-colors hover:bg-[var(--content-bg-secondary)]",
            compact ? "p-1" : "px-2.5 py-1.5 text-xs",
          )}
          title={assignee?.name ?? "Unassigned"}
        >
          {assignee ? (
            <>
              {assignee.avatarUrl ? (
                <img
                  src={assignee.avatarUrl}
                  alt={assignee.name}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style={{ background: stringToColor(assignee.name) }}
                >
                  {getInitials(assignee.name)}
                </div>
              )}
              {!compact && (
                <span
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {assignee.name}
                </span>
              )}
            </>
          ) : (
            <>
              <div
                className="w-5 h-5 rounded-full border-2 border-dashed flex-shrink-0"
                style={{ borderColor: "#D1D1E0" }}
              />
              {!compact && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  Unassigned
                </span>
              )}
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 rounded-xl py-1 min-w-[180px]"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            border: "1px solid var(--content-border)",
          }}
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
          >
            {/* Unassign option */}
            <Popover.Close asChild>
              <button
                onClick={() => onChange(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  background: !value
                    ? "var(--content-bg-secondary)"
                    : "transparent",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--content-bg-secondary)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = !value
                    ? "var(--content-bg-secondary)"
                    : "transparent")
                }
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-dashed flex-shrink-0"
                  style={{ borderColor: "#D1D1E0" }}
                />
                <span>Unassigned</span>
                {!value && (
                  <Check
                    size={12}
                    style={{ color: "#06B6D4", marginLeft: "auto" }}
                  />
                )}
              </button>
            </Popover.Close>

            {users.map((user) => {
              const isSelected = value === user.id;
              return (
                <Popover.Close key={user.id} asChild>
                  <button
                    onClick={() => onChange(user.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{
                      background: isSelected
                        ? "var(--content-bg-secondary)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "var(--content-bg-secondary)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        isSelected
                          ? "var(--content-bg-secondary)"
                          : "transparent")
                    }
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                        style={{ background: stringToColor(user.name) }}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span
                      className="flex-1 text-left font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.name}
                    </span>
                    {isSelected && (
                      <Check size={12} style={{ color: "#06B6D4" }} />
                    )}
                  </button>
                </Popover.Close>
              );
            })}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
