"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lightbulb } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { ALL_MODULES, type Module, type Priority } from "@/components/roadmap/roadmapData";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const PRIORITY_META: Record<Priority, { label: string; desc: string; color: string }> = {
  critical: { label: "Critical", desc: "Blocking, must-have for launch", color: "var(--status-danger)" },
  high:     { label: "High",     desc: "Important, strongly requested",   color: "var(--status-warning)" },
  medium:   { label: "Medium",   desc: "Nice-to-have, would improve UX",  color: "var(--status-info)" },
  low:      { label: "Low",      desc: "Polish / future consideration",   color: "var(--text-tertiary)" },
};

export default function FeatureRequestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<Module>("Chat");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(title || description);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    // In the existing roadmap page this just shows a toast — keeping parity.
    toast.success("Feature request submitted. We'll review it this week.");
    router.push("/roadmap");
  }

  return (
    <FormPageLayout
      title="Request a feature"
      subtitle="Tell us what would make VYNE better for you"
      breadcrumbs={[{ label: "Roadmap", href: "/roadmap" }, { label: "Request a feature" }]}
      backHref="/roadmap"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/roadmap")}
          primaryLabel="Submit request"
          primaryForm="feature-request-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div className="surface-elevated" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
                color: "var(--vyne-accent, var(--vyne-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lightbulb size={14} />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Tips for a great request
            </h3>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Describe the problem, not just the solution",
              "Mention who in your team would use it",
              "Include a real example if you have one",
              "Flag any deadline / compliance driver",
            ].map((tip) => (
              <li key={tip} style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", gap: 8, letterSpacing: "-0.005em" }}>
                <span style={{ color: "var(--vyne-accent, var(--vyne-purple))", flexShrink: 0 }}>→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form id="feature-request-form" onSubmit={handleSubmit}>
        <FormSection title="What would you like?" description="One request per form. Focused proposals get prioritized faster.">
          <FormField label="Feature title" htmlFor="fr-title" required>
            <input
              id="fr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI-powered invoice matching"
              required
              autoFocus
              maxLength={100}
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor="fr-description"
            required
            hint={`${description.length} / 500 characters`}
          >
            <textarea
              id="fr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="What problem does it solve? Who would use it? Any examples from other tools?"
              rows={6}
              required
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <FormSection title="Categorize" description="Helps us route this to the right team.">
          <FormField label="Module" htmlFor="fr-module">
            <select
              id="fr-module"
              value={module}
              onChange={(e) => setModule(e.target.value as Module)}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
            >
              {ALL_MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>

          <fieldset>
            <legend style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8, letterSpacing: "-0.005em" }}>
              Priority suggestion
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([p, meta]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${priority === p ? meta.color : "var(--content-border)"}`,
                    background:
                      priority === p
                        ? `color-mix(in srgb, ${meta.color} 8%, transparent)`
                        : "var(--content-bg)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s var(--ease-out-quart)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: priority === p ? meta.color : "var(--text-primary)",
                      marginBottom: 2,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {meta.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {meta.desc}
                  </div>
                </button>
              ))}
            </div>
          </fieldset>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
