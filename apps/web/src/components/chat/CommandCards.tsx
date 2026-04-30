"use client";

import React from "react";
import type { LocalMsg } from "./constants";

// ─── Helper functions ────────────────────────────────────────────
function stockStatus(qty: number): string {
  if (qty > 50) return "In Stock";
  if (qty > 10) return "Low Stock";
  return "Critical";
}
function stockColor(qty: number): string {
  if (qty > 50) return "#065F46";
  if (qty > 10) return "#92400E";
  return "#991B1B";
}
function stockBg(qty: number): string {
  if (qty > 50) return "#F0FFF4";
  if (qty > 10) return "#FFFBEB";
  return "#FFF1F2";
}

// ─── Card components ─────────────────────────────────────────────

function ApproveOrderCard({ args }: Readonly<{ args: string }>) {
  const id = args || "ORD-1042";
  return (
    <div
      style={{
        background: "#F0FFF4",
        border: "1px solid #BBF7D0",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#065F46" }}>
          Order Approved
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>
        Purchase order <strong>{id}</strong> has been approved and sent to the
        supplier. A notification was emailed to the vendor.
      </p>
    </div>
  );
}

function CreateTaskCard({ args }: Readonly<{ args: string }>) {
  const title = args || "New Task";
  return (
    <div
      style={{
        background: "#EEF2FF",
        border: "1px solid #C7D2FE",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>📋</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#3730A3" }}>
          Task Created
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#4338CA", margin: 0 }}>
        Task <strong>&quot;{title}&quot;</strong> added to the active sprint.
        Assigned to you · Due in 7 days
      </p>
    </div>
  );
}

function StockCheckCard({ args }: Readonly<{ args: string }>) {
  const sku = args || "SKU-001";
  const qty = Math.floor(Math.random() * 200) + 10;
  const status = stockStatus(qty);
  const color = stockColor(qty);
  const bg = stockBg(qty);
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>📦</span>
          <span style={{ fontWeight: 600, fontSize: 12, color }}>
            Inventory: {sku}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            background: `${color}18`,
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color }}>
        <span>
          On hand: <strong>{qty} units</strong>
        </span>
        <span>
          Reserved: <strong>{Math.floor(qty * 0.2)}</strong>
        </span>
        <span>
          Available: <strong>{Math.floor(qty * 0.8)}</strong>
        </span>
      </div>
    </div>
  );
}

function InvoiceCard({ args }: Readonly<{ args: string }>) {
  const contact = args || "Acme Corp";
  const invNum = `INV-${2000 + Math.floor(Math.random() * 100)}`;
  return (
    <div
      style={{
        background: "#FEFCE8",
        border: "1px solid #FDE68A",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>🧾</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#78350F" }}>
          Draft Invoice Created
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--badge-warning-text)",
        }}
      >
        <span>
          {invNum} for <strong>{contact}</strong> created as draft.
        </span>
        <button
          className="tap-44"
          style={{
            fontSize: 11,
            color: "var(--vyne-accent, #06B6D4)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
            padding: 0,
          }}
        >
          Open in Finance →
        </button>
      </div>
    </div>
  );
}

function AssignLeadCard({ args }: Readonly<{ args: string }>) {
  const name = args || "New Lead";
  return (
    <div
      style={{
        background: "#FDF4FF",
        border: "1px solid #E9D5FF",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#6B21A8" }}>
          Lead Assigned
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#7E22CE", margin: 0 }}>
        Lead <strong>&quot;{name}&quot;</strong> assigned to you in CRM. Stage:
        Qualified · Follow-up due tomorrow
      </p>
    </div>
  );
}

function RemindCard({ args }: Readonly<{ args: string }>) {
  const parts = args.split(" ");
  const time = parts[0] || "tomorrow";
  const reminder = parts.slice(1).join(" ") || "Follow up";
  return (
    <div
      style={{
        background: "#F0F9FF",
        border: "1px solid #BAE6FD",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>⏰</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#0C4A6E" }}>
          Reminder Set
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#0369A1", margin: 0 }}>
        I&apos;ll remind you <strong>{time}</strong>: &quot;{reminder}&quot;
      </p>
    </div>
  );
}

function PollCard({
  msg,
  onVote,
}: Readonly<{ msg: LocalMsg; onVote?: (opt: string) => void }>) {
  const question = msg.args.trim() || "Vote on this";
  const opts = ["Yes 👍", "No 👎", "Maybe 🤔"];
  const votes = msg.pollVotes ?? { "Yes 👍": 3, "No 👎": 1, "Maybe 🤔": 2 };
  const total = Object.values(votes).reduce((s, v) => s + v, 0);
  return (
    <div
      style={{
        background: "#F8FAFF",
        border: "1px solid #D8DFF0",
        borderRadius: 8,
        padding: "12px 14px",
        minWidth: 260,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14 }}>📊</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          {question}
        </span>
      </div>
      {opts.map((opt) => {
        const pct =
          total > 0 ? Math.round(((votes[opt] ?? 0) / total) * 100) : 0;
        return (
          <button
            key={opt}
            onClick={() => onVote?.(opt)}
            disabled={msg.pollVoted}
            style={{
              width: "100%",
              marginBottom: 6,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #E0E0F0",
              background: "var(--content-bg)",
              cursor: msg.pollVoted ? "default" : "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              <span>{opt}</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {votes[opt] ?? 0} · {pct}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "var(--content-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--vyne-accent, #06B6D4)",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </button>
        );
      })}
      <p
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          margin: "6px 0 0",
        }}
      >
        {total} votes · Closes in 24h
      </p>
    </div>
  );
}

// ─── CRM cards ──────────────────────────────────────────────────

interface ContactLookupData {
  mode: "found" | "created";
  contact?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    lastContact: string;
  };
  name?: string;
  email?: string;
}

function ContactCard({
  args,
  apiResult,
}: Readonly<{
  args: string;
  apiResult?: { success: boolean; data: unknown; message: string } | null;
}>) {
  if (!apiResult) {
    return (
      <div
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Looking up &quot;{args}&quot;…
      </div>
    );
  }
  if (!apiResult.success) {
    return (
      <div
        style={{
          background: "#FFF1F2",
          border: "1px solid #FECDD3",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "#9F1239",
        }}
      >
        {apiResult.message}
      </div>
    );
  }
  const data = apiResult.data as ContactLookupData;
  if (data.mode === "found" && data.contact) {
    const c = data.contact;
    return (
      <div
        style={{
          background: "#EEF2FF",
          border: "1px solid #C7D2FE",
          borderRadius: 8,
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>👤</span>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#3730A3" }}>
            Contact found
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {c.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
          {c.title} · {c.company}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
          {c.email}
          {c.phone ? ` · ${c.phone}` : ""}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>
          Last contact: {c.lastContact}
        </div>
      </div>
    );
  }
  // Created stub
  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#92400E" }}>
          New contact stub created
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>
        <strong>{data.name}</strong>
        {data.email && data.email !== "—" ? ` (${data.email})` : ""} — open CRM
        to add company, title, and tags.
      </p>
    </div>
  );
}

interface DealCardData {
  name: string;
  company: string;
  value: number;
  stage: string;
  expectedClose: string;
}

function DealCard({
  args,
  apiResult,
}: Readonly<{
  args: string;
  apiResult?: { success: boolean; data: unknown; message: string } | null;
}>) {
  if (!apiResult) {
    return (
      <div
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Creating deal &quot;{args}&quot;…
      </div>
    );
  }
  if (!apiResult.success) {
    return (
      <div
        style={{
          background: "#FFF1F2",
          border: "1px solid #FECDD3",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "#9F1239",
        }}
      >
        {apiResult.message}
      </div>
    );
  }
  const d = apiResult.data as DealCardData;
  return (
    <div
      style={{
        background: "#F0FFF4",
        border: "1px solid #BBF7D0",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>💼</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#065F46" }}>
          Deal added to pipeline
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        {d.name}
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          color: "#047857",
          marginTop: 6,
          flexWrap: "wrap",
        }}
      >
        <span>
          🏢 <strong>{d.company}</strong>
        </span>
        {d.value > 0 && (
          <span>
            💰 <strong>${d.value.toLocaleString()}</strong>
          </span>
        )}
        <span>
          📍 {d.stage}
        </span>
        <span>
          📅 {d.expectedClose}
        </span>
      </div>
    </div>
  );
}

interface LogCallData {
  contactName: string;
  notes: string;
  ts: string;
  matched: boolean;
}

function LogCallCard({
  args,
  apiResult,
}: Readonly<{
  args: string;
  apiResult?: { success: boolean; data: unknown; message: string } | null;
}>) {
  if (!apiResult) {
    return (
      <div
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Logging call: {args}
      </div>
    );
  }
  if (!apiResult.success) {
    return (
      <div
        style={{
          background: "#FFF1F2",
          border: "1px solid #FECDD3",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
          color: "#9F1239",
        }}
      >
        {apiResult.message}
      </div>
    );
  }
  const d = apiResult.data as LogCallData;
  return (
    <div
      style={{
        background: "#EEF2FF",
        border: "1px solid #C7D2FE",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>📞</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#3730A3" }}>
          Call logged · {d.matched ? "Matched" : "Unmatched"} contact
        </span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "#4338CA",
          margin: "2px 0 0",
        }}
      >
        <strong>{d.contactName}</strong>: {d.notes}
      </p>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginTop: 6,
        }}
      >
        Logged at {new Date(d.ts).toLocaleString()}
      </div>
    </div>
  );
}

// ─── Loading Card ───────────────────────────────────────────────

function LoadingCard({ cmd }: Readonly<{ cmd: string }>) {
  return (
    <div
      style={{
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          border: "2px solid #06B6D4",
          borderTop: "2px solid transparent",
          borderRadius: "50%",
          animation: "cmd-spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Executing /{cmd}...
      </span>
      <style>{`@keyframes cmd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────

export function cmdOutput(
  msg: LocalMsg,
  onVote?: (opt: string) => void,
): React.ReactNode {
  // Show loading state
  if (msg.loading) return <LoadingCard cmd={msg.cmd} />;

  if (msg.cmd === "approve-order")
    return <ApproveOrderCard args={msg.args.trim()} />;
  if (msg.cmd === "create-task")
    return <CreateTaskCard args={msg.args.trim()} />;
  if (msg.cmd === "stock-check")
    return <StockCheckCard args={msg.args.trim()} />;
  if (msg.cmd === "invoice") return <InvoiceCard args={msg.args.trim()} />;
  if (msg.cmd === "assign-lead")
    return <AssignLeadCard args={msg.args.trim()} />;
  if (msg.cmd === "remind") return <RemindCard args={msg.args.trim()} />;
  if (msg.cmd === "poll") return <PollCard msg={msg} onVote={onVote} />;
  if (msg.cmd === "contact")
    return <ContactCard args={msg.args.trim()} apiResult={msg.apiResult} />;
  if (msg.cmd === "deal")
    return <DealCard args={msg.args.trim()} apiResult={msg.apiResult} />;
  if (msg.cmd === "log-call")
    return <LogCallCard args={msg.args.trim()} apiResult={msg.apiResult} />;
  if (msg.cmd === "summarize") return null;
  if (msg.cmd === "ask") return <AskCard msg={msg} />;
  return (
    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
      Command /{msg.cmd} executed.
    </span>
  );
}

function AskCard({ msg }: { msg: LocalMsg }) {
  const result = msg.apiResult?.data as
    | { answer?: string; citations?: Array<{ kind: string; id: string; label: string }> }
    | undefined;
  const answer = result?.answer ?? msg.apiResult?.message ?? "";
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10) 0%, rgba(124,77,255,0.06) 100%)",
        border: "1px dashed rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.45)",
        borderRadius: 12,
        padding: "12px 14px",
        position: "relative",
        maxWidth: 540,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--vyne-teal)",
          marginBottom: 6,
        }}
      >
        👁 Only you can see this · Vyne AI inline
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          marginBottom: 6,
          fontStyle: "italic",
        }}
      >
        /ask {msg.args}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
        }}
      >
        {answer}
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={() => {
            globalThis.dispatchEvent(
              new CustomEvent("vyne:share-ask", {
                detail: {
                  question: msg.args,
                  answer,
                },
              }),
            );
          }}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "none",
            background: "var(--vyne-teal)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Share with channel
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(answer);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
}
