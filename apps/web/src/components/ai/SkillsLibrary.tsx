"use client";

// Skills library (UI_UPGRADE_PLAN.md 5.4).
//
// A Skill is a saved prompt that carries `steps: SkillStep[]` — a
// sequence of tool calls the AI runs when the user types `/skill <slug>`
// in the chat composer. The library shows every existing skill, lets
// admins build new ones (title + slug + steps as JSON), and shows the
// matching slash trigger inline.

import { useState } from "react";
import {
  Wrench,
  Plus,
  Trash2,
  Save,
  X,
  Copy,
  Loader2,
  Play,
} from "lucide-react";
import {
  useAiWorkspace,
  type SavedPrompt,
  type SkillStep,
} from "@/lib/stores/aiWorkspace";
import {
  executeToolCall,
  type ToolCall,
} from "@/lib/ai/toolExecutor";
import { useAgentTraces } from "@/lib/stores/agentTraces";
import toast from "react-hot-toast";

function isSkill(p: SavedPrompt): boolean {
  return Array.isArray(p.steps) && p.steps.length > 0;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function SkillsLibrary() {
  const prompts = useAiWorkspace((s) => s.prompts);
  const savePrompt = useAiWorkspace((s) => s.savePrompt);
  const removePrompt = useAiWorkspace((s) => s.removePrompt);
  const skills = prompts.filter(isSkill);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    slug: string;
    body: string;
    stepsJson: string;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function startNew() {
    setEditingId("__new__");
    setDraft({
      title: "",
      slug: "",
      body: "",
      stepsJson:
        '[\n  { "tool": "queryDeals", "args": { "stage": "Negotiation" } }\n]',
    });
    setParseError(null);
  }

  function startEdit(skill: SavedPrompt) {
    setEditingId(skill.id);
    setDraft({
      title: skill.title,
      slug: skill.slug ?? "",
      body: skill.body,
      stepsJson: JSON.stringify(skill.steps ?? [], null, 2),
    });
    setParseError(null);
  }

  function save() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    let steps: SkillStep[];
    try {
      const parsed = JSON.parse(draft.stepsJson);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      for (const s of parsed) {
        if (
          !s ||
          typeof s !== "object" ||
          typeof s.tool !== "string" ||
          !s.tool.trim()
        ) {
          throw new Error('Each step needs a "tool" string');
        }
        if (!s.args || typeof s.args !== "object") {
          throw new Error('Each step needs an "args" object');
        }
      }
      steps = parsed as SkillStep[];
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    savePrompt({
      id: editingId === "__new__" ? undefined : (editingId ?? undefined),
      title,
      slug: draft.slug.trim() || slugify(title),
      body: draft.body,
      tags: ["skill"],
      shared: true,
      steps,
    });
    toast.success("Skill saved");
    setEditingId(null);
    setDraft(null);
    setParseError(null);
  }

  return (
    <section
      aria-labelledby="skills-library-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Wrench size={16} aria-hidden="true" />
        <h3 id="skills-library-heading" style={{ margin: 0, fontSize: 14 }}>
          Skills
        </h3>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginLeft: 4,
          }}
        >
          {skills.length} saved
        </span>
        <button
          type="button"
          onClick={startNew}
          disabled={editingId !== null}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 12,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: editingId === null ? "pointer" : "not-allowed",
            opacity: editingId === null ? 1 : 0.5,
          }}
        >
          <Plus size={12} />
          New skill
        </button>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Saved multi-step chains. Run from the chat by typing{" "}
        <code>/skill &lt;slug&gt;</code>. Each step calls a tool from the
        catalog with the args you provide; results stream into the
        conversation as agent-trace steps.
      </p>

      {/* Composer */}
      {editingId !== null && draft && (
        <div
          style={{
            background: "var(--content-elevated)",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft({ ...draft, title: e.target.value })
              }
              placeholder="Title (e.g. Weekly pipeline review)"
              style={{
                flex: 2,
                minWidth: 220,
                padding: "6px 10px",
                fontSize: 13,
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
            <input
              value={draft.slug}
              onChange={(e) =>
                setDraft({ ...draft, slug: slugify(e.target.value) })
              }
              placeholder={
                draft.title ? `slug (e.g. ${slugify(draft.title)})` : "slug"
              }
              style={{
                flex: 1,
                minWidth: 160,
                padding: "6px 10px",
                fontSize: 13,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <input
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="One-line description"
            style={{
              padding: "6px 10px",
              fontSize: 13,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
            }}
          />
          <textarea
            value={draft.stepsJson}
            onChange={(e) => {
              setDraft({ ...draft, stepsJson: e.target.value });
              setParseError(null);
            }}
            spellCheck={false}
            rows={Math.min(14, Math.max(6, draft.stepsJson.split("\n").length))}
            placeholder="Steps (JSON array of { tool, args })"
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 12,
              padding: 8,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              resize: "vertical",
            }}
          />
          {parseError && (
            <div style={{ fontSize: 12, color: "var(--accent-error)" }}>
              {parseError}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={save}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid var(--vyne-accent, var(--vyne-purple))",
                borderRadius: 6,
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Save size={12} />
              Save skill
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(null);
                setParseError(null);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {skills.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--content-border)",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          No skills saved yet. Click "New skill" to create one.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {skills.map((s) => (
            <SkillRow
              key={s.id}
              skill={s}
              onEdit={() => startEdit(s)}
              onDelete={() => {
                if (confirm(`Delete skill "${s.title}"?`)) removePrompt(s.id);
              }}
              isEditing={editingId === s.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SkillRow({
  skill,
  onEdit,
  onDelete,
  isEditing,
}: {
  skill: SavedPrompt;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  const [running, setRunning] = useState(false);
  const slug = skill.slug ?? skill.id;
  const trigger = `/skill ${slug}`;

  async function runHere() {
    if (!skill.steps || skill.steps.length === 0) return;
    setRunning(true);
    const traces = useAgentTraces.getState();
    const trace = traces.startTrace({
      conversationId: `inline-${skill.id}`,
      goal: `Skill: ${skill.title}`,
    });
    let failures = 0;
    for (const step of skill.steps) {
      const tracedStep = traces.appendStep(trace.id, {
        kind: "tool",
        name: step.tool,
        argsPreview: step.args,
        status: "running",
      });
      const call: ToolCall = { tool: step.tool, args: step.args };
      const result = await executeToolCall(call);
      if (tracedStep) {
        traces.completeStep(trace.id, tracedStep.id, {
          status: result.ok ? "ok" : "failed",
          outputPreview: result,
          error: result.ok ? undefined : result.detail,
        });
      }
      if (!result.ok) failures++;
    }
    traces.finishTrace(trace.id, {
      status:
        failures === 0
          ? "success"
          : failures === skill.steps.length
            ? "failed"
            : "partial",
      summary: `${skill.steps.length - failures}/${skill.steps.length} steps OK`,
    });
    setRunning(false);
    if (failures === 0) toast.success(`Skill ran (${skill.steps.length} steps)`);
    else toast.error(`${failures} step(s) failed — check Settings → AI`);
  }

  function copyTrigger() {
    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(trigger).then(() => {
        toast.success("Trigger copied");
      });
    }
  }

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: isEditing
          ? "var(--vyne-accent-soft, var(--content-elevated))"
          : "var(--content-elevated)",
        border: `1px solid ${
          isEditing
            ? "var(--vyne-accent, var(--vyne-purple))"
            : "var(--content-border)"
        }`,
        borderRadius: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{skill.title}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          <code
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            {trigger}
          </code>
          <span>
            {skill.steps?.length ?? 0} step
            {(skill.steps?.length ?? 0) === 1 ? "" : "s"}
          </span>
          {skill.body && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 320,
              }}
            >
              · {skill.body}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={runHere}
        disabled={running}
        aria-label={`Run skill ${skill.title}`}
        title="Run now"
        style={{
          width: 28,
          height: 28,
          border: "1px solid var(--vyne-accent, var(--vyne-purple))",
          borderRadius: 5,
          background: "transparent",
          color: "var(--vyne-accent, var(--vyne-purple))",
          cursor: running ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {running ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Play size={12} />
        )}
      </button>
      <button
        type="button"
        onClick={copyTrigger}
        aria-label="Copy slash trigger"
        title="Copy slash trigger"
        style={{
          width: 28,
          height: 28,
          border: "1px solid var(--content-border)",
          borderRadius: 5,
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Copy size={12} />
      </button>
      <button
        type="button"
        onClick={onEdit}
        style={{
          padding: "4px 10px",
          fontSize: 12,
          border: "1px solid var(--content-border)",
          borderRadius: 5,
          background: "transparent",
          color: "var(--text-primary)",
          cursor: "pointer",
        }}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete skill ${skill.title}`}
        title="Delete"
        style={{
          width: 28,
          height: 28,
          border: "1px solid var(--content-border)",
          borderRadius: 5,
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
}
