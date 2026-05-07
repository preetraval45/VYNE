"use client";

import { useState } from "react";
import {
  Sparkles,
  Brain,
  Library,
  Clock,
  Plus,
  X,
  Pin,
} from "lucide-react";
import {
  useAiWorkspace,
  type PersonaTone,
  type PersonaLength,
} from "@/lib/stores/aiWorkspace";
import {
  useAiSchedules,
  CADENCE_LABELS,
  type ScheduleCadence,
  type ScheduleDelivery,
} from "@/lib/stores/aiSchedules";

interface Props {
  onToast: (message: string) => void;
}

const TONE_OPTIONS: PersonaTone[] = [
  "balanced",
  "concise",
  "detailed",
  "friendly",
  "formal",
  "technical",
];

const LENGTH_OPTIONS: PersonaLength[] = ["short", "medium", "long"];

export default function AiPreferencesSettings({ onToast }: Props) {
  const persona = useAiWorkspace((s) => s.persona);
  const setPersona = useAiWorkspace((s) => s.setPersona);
  const resetPersona = useAiWorkspace((s) => s.resetPersona);
  const memories = useAiWorkspace((s) => s.memories);
  const addMemory = useAiWorkspace((s) => s.addMemory);
  const toggleMemory = useAiWorkspace((s) => s.toggleMemory);
  const removeMemory = useAiWorkspace((s) => s.removeMemory);
  const prompts = useAiWorkspace((s) => s.prompts);
  const savePrompt = useAiWorkspace((s) => s.savePrompt);
  const removePrompt = useAiWorkspace((s) => s.removePrompt);

  const schedules = useAiSchedules((s) => s.schedules);
  const addSchedule = useAiSchedules((s) => s.add);
  const removeSchedule = useAiSchedules((s) => s.remove);
  const toggleSchedule = useAiSchedules((s) => s.toggle);

  const [bannedDraft, setBannedDraft] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [promptBody, setPromptBody] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [schedulePrompt, setSchedulePrompt] = useState("");
  const [scheduleCadence, setScheduleCadence] =
    useState<ScheduleCadence>("daily-9am");
  const [scheduleDelivery, setScheduleDelivery] =
    useState<ScheduleDelivery>("in-app");

  return (
    <div>
      {/* ── Persona (16.2) ──────────────────────────────────────── */}
      <Card title="Persona" icon={Sparkles}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Shapes how Vyne AI replies in every chat. Cascades into every
          AI-powered surface (chat, sidebar, deal coach, dunning, …).
        </p>

        <Field label="Tone">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TONE_OPTIONS.map((t) => (
              <Pill
                key={t}
                active={persona.tone === t}
                onClick={() => setPersona({ tone: t })}
              >
                {t}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Default response length">
          <div style={{ display: "flex", gap: 6 }}>
            {LENGTH_OPTIONS.map((l) => (
              <Pill
                key={l}
                active={persona.length === l}
                onClick={() => setPersona({ length: l })}
              >
                {l}
              </Pill>
            ))}
          </div>
        </Field>

        <Field
          label="Custom instructions"
          hint="Free-form addendum injected into every system prompt."
        >
          <textarea
            value={persona.customInstructions}
            onChange={(e) => setPersona({ customInstructions: e.target.value })}
            placeholder="e.g. Always show units. Prefer SI. Cite sources by id."
            rows={3}
            aria-label="Custom instructions"
            style={textareaStyle}
          />
        </Field>

        <Field
          label="Banned words / phrases"
          hint="The AI will avoid these in every reply."
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <input
              value={bannedDraft}
              onChange={(e) => setBannedDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!bannedDraft.trim()) return;
                  setPersona({
                    bannedWords: [...persona.bannedWords, bannedDraft.trim()],
                  });
                  setBannedDraft("");
                }
              }}
              placeholder="Add a phrase, press Enter"
              aria-label="Add banned phrase"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {persona.bannedWords.map((w) => (
              <span key={w} style={chipStyle}>
                {w}
                <button
                  type="button"
                  onClick={() =>
                    setPersona({
                      bannedWords: persona.bannedWords.filter((x) => x !== w),
                    })
                  }
                  aria-label={`Remove ${w}`}
                  style={chipBtnStyle}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
        </Field>

        <Field label="Translate replies to my locale">
          <Toggle
            checked={persona.translateToLocale}
            onChange={() =>
              setPersona({ translateToLocale: !persona.translateToLocale })
            }
            label={
              persona.translateToLocale
                ? "On — replies translated to your browser language"
                : "Off"
            }
          />
        </Field>

        <button
          type="button"
          onClick={() => {
            resetPersona();
            onToast("Persona reset to defaults");
          }}
          style={ghostBtnStyle}
        >
          Reset persona
        </button>
      </Card>

      {/* ── Memories (16.3) ─────────────────────────────────────── */}
      <Card title="Long-term memory" icon={Brain}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Notes about you that the AI applies silently every turn.
          Toggle off to keep a memory but stop using it.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={memoryDraft}
            onChange={(e) => setMemoryDraft(e.target.value)}
            placeholder="e.g. I prefer terse summaries with no preamble."
            aria-label="Add memory"
            style={inputStyle}
          />
          <button
            type="button"
            disabled={!memoryDraft.trim()}
            onClick={() => {
              addMemory(memoryDraft);
              setMemoryDraft("");
              onToast("Memory saved");
            }}
            style={primaryBtnStyle}
          >
            Add
          </button>
        </div>
        {memories.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "16px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            No memories yet. Add one above and the AI will reference it
            in every reply.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {memories.map((m) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: m.active
                    ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                    : "var(--content-secondary)",
                  border: `1px solid ${m.active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                  opacity: m.active ? 1 : 0.7,
                }}
              >
                <Toggle checked={m.active} onChange={() => toggleMemory(m.id)} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "var(--text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {m.body}
                </span>
                <button
                  type="button"
                  aria-label="Remove memory"
                  onClick={() => removeMemory(m.id)}
                  style={iconBtnStyle}
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Prompt library (16.7) ───────────────────────────────── */}
      <Card title="Team prompt library" icon={Library}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Saved prompts — yours + workspace-shared. Run any from Cmd+K
          or the AI sidebar.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <input
            value={promptTitle}
            onChange={(e) => setPromptTitle(e.target.value)}
            placeholder="Prompt title"
            aria-label="Prompt title"
            style={inputStyle}
          />
          <textarea
            value={promptBody}
            onChange={(e) => setPromptBody(e.target.value)}
            placeholder="Prompt body — what the AI should do"
            rows={3}
            aria-label="Prompt body"
            style={textareaStyle}
          />
          <button
            type="button"
            disabled={!promptTitle.trim() || !promptBody.trim()}
            onClick={() => {
              savePrompt({
                title: promptTitle,
                body: promptBody,
                tags: [],
                shared: false,
              });
              setPromptTitle("");
              setPromptBody("");
              onToast("Prompt saved");
            }}
            style={primaryBtnStyle}
          >
            Save prompt
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {prompts.map((p) => (
            <li
              key={p.id}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <strong
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-primary)",
                    flex: 1,
                  }}
                >
                  {p.title}
                </strong>
                {p.shared && (
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: "rgba(245, 158, 11, 0.12)",
                      color: "#D97706",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    SHARED
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePrompt(p.id)}
                  aria-label="Remove prompt"
                  style={iconBtnStyle}
                >
                  <X size={11} />
                </button>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Scheduled runs (16.12) ──────────────────────────────── */}
      <Card title="Scheduled AI runs" icon={Clock}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Run a saved prompt on a cron and drop the result into the
          notification bell, an email, or a Slack channel.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            placeholder="Schedule name"
            aria-label="Schedule name"
            style={inputStyle}
          />
          <textarea
            value={schedulePrompt}
            onChange={(e) => setSchedulePrompt(e.target.value)}
            placeholder="Prompt — what should the AI do every run?"
            rows={2}
            aria-label="Schedule prompt"
            style={textareaStyle}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={scheduleCadence}
              onChange={(e) => setScheduleCadence(e.target.value as ScheduleCadence)}
              aria-label="Cadence"
              style={selectStyle}
            >
              {Object.entries(CADENCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={scheduleDelivery}
              onChange={(e) => setScheduleDelivery(e.target.value as ScheduleDelivery)}
              aria-label="Delivery"
              style={selectStyle}
            >
              <option value="in-app">In-app</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
            <button
              type="button"
              disabled={!scheduleName.trim() || !schedulePrompt.trim()}
              onClick={() => {
                addSchedule({
                  name: scheduleName,
                  prompt: schedulePrompt,
                  cadence: scheduleCadence,
                  delivery: scheduleDelivery,
                });
                setScheduleName("");
                setSchedulePrompt("");
                onToast("Schedule created");
              }}
              style={primaryBtnStyle}
            >
              <Plus size={11} /> Create
            </button>
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {schedules.length === 0 && (
            <li
              style={{
                padding: "16px 0",
                textAlign: "center",
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              No schedules yet. Create one above.
            </li>
          )}
          {schedules.map((s) => (
            <li
              key={s.id}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <strong style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
                    {s.name}
                  </strong>
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: "var(--content-secondary)",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.delivery}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {CADENCE_LABELS[s.cadence]}
                  {s.lastRunAt && ` · last ran ${new Date(s.lastRunAt).toLocaleString()}`}
                </p>
              </div>
              <Toggle checked={s.enabled} onChange={() => toggleSchedule(s.id)} />
              <button
                type="button"
                onClick={() => removeSchedule(s.id)}
                aria-label="Delete schedule"
                style={iconBtnStyle}
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-secondary)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      {hint && (
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {hint}
        </p>
      )}
      {children}
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
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
        background: active
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
          : "var(--content-bg)",
        color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        textTransform: "capitalize",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked ? "true" : "false"}
        aria-label={label ?? "Toggle"}
        onClick={onChange}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)",
          position: "relative",
          cursor: "pointer",
          border: "none",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--content-bg)",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.18s",
          }}
        />
      </button>
      {label && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      )}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 7,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12.5,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 7,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12.5,
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  flex: 1,
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "7px 14px",
  borderRadius: 7,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
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

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 4px 2px 8px",
  borderRadius: 999,
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-primary)",
};

const chipBtnStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};
