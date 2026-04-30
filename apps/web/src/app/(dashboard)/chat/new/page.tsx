"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Hash, Lock } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useChannels } from "@/hooks/useMessages";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function NewChannelPage() {
  const router = useRouter();
  const { createChannel } = useChannels();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const slug = slugify(name);
  const dirty = !!(name || description);
  const canSubmit = slug.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ch = await createChannel(name.trim(), description.trim(), isPrivate);
      toast.success(`Channel #${ch.name} created`);
      router.push("/chat");
    } catch {
      toast.error("Couldn't create channel");
      setSubmitting(false);
    }
  }

  return (
    <FormPageLayout
      title="Create a channel"
      subtitle="Channels are where your team communicates. Best when organized around a topic."
      breadcrumbs={[{ label: "Chat", href: "/chat" }, { label: "New channel" }]}
      backHref="/chat"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/chat")}
          primaryLabel="Create channel"
          primaryForm="new-channel-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div className="surface-elevated" style={{ padding: 20 }}>
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
            Preview
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--content-secondary)",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
                color: "var(--vyne-accent, var(--vyne-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isPrivate ? <Lock size={13} /> : <Hash size={13} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {slug || "channel-name"}
              </div>
              {description && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <form id="new-channel-form" onSubmit={handleSubmit}>
        <FormSection title="Name & description">
          <FormField
            label="Name"
            htmlFor="ch-name"
            required
            hint={slug ? `Will appear as #${slug}` : "Letters, numbers, and dashes only"}
          >
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  pointerEvents: "none",
                }}
              >
                #
              </span>
              <input
                id="ch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. product-launch"
                required
                autoFocus
                maxLength={40}
                className={inputClass}
                style={{ ...inputStyle, paddingLeft: 28 }}
              />
            </div>
          </FormField>
          <FormField label="Description" htmlFor="ch-desc" hint="Optional — what's this channel about?">
            <input
              id="ch-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Coordinating the Q2 launch"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <FormSection title="Visibility">
          <div style={{ display: "flex", gap: 10 }}>
            {[
              {
                value: false,
                icon: <Hash size={16} />,
                label: "Public",
                desc: "Anyone in the workspace can join",
              },
              {
                value: true,
                icon: <Lock size={16} />,
                label: "Private",
                desc: "Only invited members can see it",
              },
            ].map((opt) => {
              const active = isPrivate === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setIsPrivate(opt.value)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1.5px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                    background: active ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.06)" : "var(--content-bg)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s var(--ease-out-quart)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: active ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.14)" : "var(--content-secondary)",
                      color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
                        marginBottom: 2,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
