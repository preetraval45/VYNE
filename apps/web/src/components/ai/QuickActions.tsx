"use client";

import {
  FileText,
  Wrench,
  StickyNote,
  Network,
  Sheet,
  Presentation,
  Sparkles,
  ListChecks,
  Code2,
  GitBranch,
  Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  /** Pre-built prompt the user can edit, or send as-is */
  prompt: string;
  /** Short hint shown under the label on hover */
  hint: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "brd",
    label: "BRD",
    icon: FileText,
    color: "#0891B2",
    hint: "Business Requirements Document",
    prompt:
      "I want to create a Business Requirements Document (BRD). Before generating, ask me 4–6 specific questions you need answered to produce a high-quality BRD — covering product/feature name, primary user, core problem, success metrics, timeline, and any hard constraints. Wait for my answers; do NOT emit the artifact yet.",
  },
  {
    id: "trd",
    label: "TRD",
    icon: Wrench,
    color: "#8B5CF6",
    hint: "Technical Requirements Document",
    prompt:
      "I want to create a Technical Requirements Document (TRD). Before generating, ask me 4–6 specific questions — covering the system/feature, expected scale, integrations, security/compliance constraints, deployment target, and SLAs. Wait for my answers; do NOT emit the artifact yet.",
  },
  {
    id: "spec",
    label: "Spec",
    icon: ListChecks,
    color: "var(--vyne-accent, #06B6D4)",
    hint: "Feature spec / one-pager",
    prompt:
      "I want to draft a feature spec / one-pager. First ask me 3–5 specific questions — what problem this solves, who the user is, the proposed solution outline, scope boundaries, and the key risks. Wait for my answers, then produce the spec as a fenced markdown artifact.",
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    color: "#22C55E",
    hint: "Meeting notes",
    prompt:
      "Help me draft structured meeting notes. First ask me: what was the meeting topic, who attended, and what's the source content (transcript / bullet points / your memory). Then produce a markdown artifact with Attendees, Agenda, Discussion, Decisions, Action Items, Next Steps.",
  },
  {
    id: "diagram",
    label: "Diagram",
    icon: Network,
    color: "#EC4899",
    hint: "Mermaid flowchart / sequence / ER",
    prompt:
      "Generate a Mermaid diagram. If my request is specific (e.g., 'flowchart for order checkout'), produce it directly. If vague, ask one focused clarifying question (what to diagram + which type), then generate.",
  },
  {
    id: "sheet",
    label: "Sheet",
    icon: Sheet,
    color: "#16A34A",
    hint: "CSV → open in Google Sheets",
    prompt:
      "Generate a CSV spreadsheet as a `csv` artifact with real columns and 8–15 rows. If the topic isn't specified, ask me what the spreadsheet is for, then generate it.",
  },
  {
    id: "slides",
    label: "Slides",
    icon: Presentation,
    color: "#F59E0B",
    hint: "Markdown slide deck",
    prompt:
      "I want to create a presentation. First ask me: the topic, audience, length (5/10/15 slides), and any key messages I want covered. Then produce a `slides` artifact with `---` between slides, opening with a title slide and closing with a call-to-action.",
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    color: "#6366F1",
    hint: "Code artifact",
    prompt:
      "Generate code. If the requirements are clear from my message, produce it directly. If not, ask me one focused question — what language, what does it do, what are the inputs/outputs.",
  },
  {
    id: "flow",
    label: "Flow",
    icon: GitBranch,
    color: "#10B981",
    hint: "Workflow / process flow",
    prompt:
      "Generate a process flow. Ask me what process to map and key constraints, then produce both (1) a Mermaid flowchart artifact AND (2) a numbered step-by-step markdown checklist artifact covering happy path + failure modes.",
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    icon: Sparkles,
    color: "#A855F7",
    hint: "Idea generation",
    prompt:
      "Brainstorm 10 distinct, non-obvious ideas. If I haven't given you a topic, ask me one focused question first. Otherwise produce the markdown artifact with one-line headlines + 2-sentence explanations per idea, mixing workspace-grounded ideas with broader external thinking.",
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    color: "#0EA5E9",
    hint: "Generate a picture (Imagen)",
    // Special prefix `__IMAGE__` is intercepted by the chat page so the
    // request hits /api/ai/image instead of the streaming text endpoint.
    prompt:
      "__IMAGE__Generate an image of: (describe what you want me to draw — style, subject, mood, composition).",
  },
];

interface Props {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Horizontal scrollable strip of Quick Action buttons. Tapping one
 * sends the pre-built prompt as a user message — Vyne AI then
 * generates the requested artifact (BRD/TRD/diagram/sheet/slides/etc.).
 *
 * Renders above the composer in /ai/chat.
 */
export function QuickActions({ onAction, disabled }: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Quick AI actions"
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "0 0 8px",
        marginBottom: 8,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
      }}
    >
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(a.prompt)}
            aria-label={`${a.label}: ${a.hint}`}
            title={a.hint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 999,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              color: "var(--text-primary)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              flexShrink: 0,
              transition:
                "border-color 0.15s, background 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = a.color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: `${a.color}1A`,
                color: a.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={11} />
            </span>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
