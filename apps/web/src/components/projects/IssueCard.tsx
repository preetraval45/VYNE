"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Calendar } from "lucide-react";
import type { Issue } from "@/types";
import { STATUS_META, PRIORITY_META } from "@/types";
import { cn, formatDate, getInitials, stringToColor } from "@/lib/utils";
import { IssuePanel } from "./IssuePanel";

interface IssueCardProps {
  issue: Issue;
  isDragging?: boolean;
}

export function IssueCard({ issue, isDragging = false }: IssueCardProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityMeta = PRIORITY_META[issue.priority];
  const statusMeta = STATUS_META[issue.status];

  const PRIORITY_DOT_COLORS: Record<string, string> = {
    urgent: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#A0A0B8",
    no_priority: "#D1D1E0",
  };

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <motion.div
          whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)", y: -1 }}
          transition={{ duration: 0.12 }}
          onClick={() => setPanelOpen(true)}
          className={cn(
            "group p-3 rounded-lg cursor-pointer select-none",
            isSortableDragging && "opacity-40",
          )}
          style={{
            background: isSortableDragging ? "#CFFAFE" : "#FFFFFF",
            border: isSortableDragging
              ? "1px solid #06B6D4"
              : "1px solid #E8E8F0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {/* Row 1: Priority dot + identifier + title */}
          <div className="flex items-start gap-2 mb-2">
            {/* Priority indicator */}
            <div className="mt-0.5 flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: PRIORITY_DOT_COLORS[issue.priority],
                  boxShadow: `0 0 4px ${PRIORITY_DOT_COLORS[issue.priority]}60`,
                }}
                title={priorityMeta.label}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-xs font-mono font-medium flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {issue.identifier}
                </span>
              </div>
              <p
                className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-[#06B6D4] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {issue.title}
              </p>
            </div>
          </div>

          {/* Row 2: Status + meta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Status mini pill */}
              <span
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: statusMeta.bgColor,
                  color: statusMeta.color,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusMeta.color }}
                />
              </span>

              {/* Labels */}
              {issue.labels?.slice(0, 2).map((label) => (
                <span
                  key={label.id}
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: label.color + "20", color: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Due date */}
              {issue.dueDate && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{
                    color:
                      new Date(issue.dueDate) < new Date()
                        ? "#EF4444"
                        : "#A0A0B8",
                  }}
                >
                  <Calendar size={10} />
                  {formatDate(issue.dueDate)}
                </span>
              )}

              {/* Comments */}
              {issue.comments && issue.comments.length > 0 && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <MessageSquare size={10} />
                  {issue.comments.length}
                </span>
              )}

              {/* Assignee */}
              {issue.assignee ? (
                <div title={issue.assignee.name}>
                  {issue.assignee.avatarUrl ? (
                    <img
                      src={issue.assignee.avatarUrl}
                      alt={issue.assignee.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: stringToColor(issue.assignee.name) }}
                    >
                      {getInitials(issue.assignee.name)}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border-2 border-dashed"
                  style={{ borderColor: "var(--content-border)" }}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Issue Detail Panel */}
      <IssuePanel
        issue={issue}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
