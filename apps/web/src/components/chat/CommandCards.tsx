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
          color: "#92400E",
        }}
      >
        <span>
          {invNum} for <strong>{contact}</strong> created as draft.
        </span>
        <button
          style={{
            fontSize: 11,
            color: "#6C47FF",
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
        <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1A2E" }}>
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
              background: "#fff",
              cursor: msg.pollVoted ? "default" : "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#1A1A2E",
                marginBottom: 4,
              }}
            >
              <span>{opt}</span>
              <span style={{ color: "#6B6B8A" }}>
                {votes[opt] ?? 0} · {pct}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "#E8E8F0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "#6C47FF",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </button>
        );
      })}
      <p style={{ fontSize: 10, color: "#A0A0B8", margin: "6px 0 0" }}>
        {total} votes · Closes in 24h
      </p>
    </div>
  );
}

// ─── Loading Card ───────────────────────────────────────────────

function LoadingCard({ cmd }: Readonly<{ cmd: string }>) {
  return (
    <div
      style={{
        background: "#F8F8FC",
        border: "1px solid #E8E8F0",
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
          border: "2px solid #6C47FF",
          borderTop: "2px solid transparent",
          borderRadius: "50%",
          animation: "cmd-spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 12, color: "#6B6B8A" }}>
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
  if (msg.cmd === "summarize") return null;
  return (
    <span style={{ fontSize: 12, color: "#6B6B8A" }}>
      Command /{msg.cmd} executed.
    </span>
  );
}
