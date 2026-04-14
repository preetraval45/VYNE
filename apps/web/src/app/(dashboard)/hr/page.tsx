"use client";

import { useState } from "react";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  MOCK_DOCS,
  type Department,
  type Employee,
  type LeaveRequest,
  type LeaveRequestStatus,
} from "@/lib/fixtures/hr";

type HRTab = "employees" | "leave" | "payroll" | "orgchart";

// ─── Helpers ──────────────────────────────────────────────────────
function fmtSalary(n: number): string {
  return `$${n.toLocaleString()}`;
}

function fmtNetPay(emp: Employee): number {
  return Math.round(emp.baseSalary / 12 - emp.deductions + emp.bonus);
}

// ─── Department chip ──────────────────────────────────────────────
function DeptChip({ dept }: Readonly<{ dept: Department }>) {
  const colors: Record<Department, { bg: string; color: string }> = {
    Engineering: { bg: "rgba(108,71,255,0.12)", color: "#8B68FF" },
    Product: { bg: "rgba(155,89,182,0.12)", color: "#A855F7" },
    Sales: { bg: "rgba(239,68,68,0.1)", color: "var(--status-danger)" },
    Finance: { bg: "rgba(59,130,246,0.1)", color: "var(--status-info)" },
    Operations: { bg: "rgba(245,158,11,0.1)", color: "var(--status-warning)" },
  };
  const s = colors[dept];
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {dept}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ emp }: Readonly<{ emp: Employee }>) {
  if (emp.status === "Active") {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 500,
          background: "var(--badge-success-bg)",
          color: "var(--badge-success-text)",
        }}
      >
        Active
      </span>
    );
  }
  if (emp.status === "Remote") {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 500,
          background: "#EFF6FF",
          color: "#1E40AF",
        }}
      >
        Remote
      </span>
    );
  }
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: "var(--badge-warning-bg)",
        color: "var(--badge-warning-text)",
      }}
    >
      On Leave{emp.leaveNote ? ` · ${emp.leaveNote}` : ""}
    </span>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────
function Avatar({
  emp,
  size = 40,
}: Readonly<{ emp: Employee; size?: number }>) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: emp.avatarGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {emp.initials}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        borderBottom: active
          ? "2px solid var(--vyne-purple)"
          : "2px solid transparent",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Employee modal ───────────────────────────────────────────────
function EmployeeModal({
  emp,
  onClose,
}: Readonly<{ emp: Employee; onClose: () => void }>) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          borderRadius: 14,
          width: 720,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Employee Profile
          </span>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: 20,
              padding: "2px 6px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Modal body — two columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Left: avatar + core info */}
          <div
            style={{
              padding: "24px 20px",
              background: "var(--content-secondary)",
              borderRight: "1px solid var(--content-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              overflowY: "auto",
            }}
          >
            <Avatar emp={emp} size={72} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {emp.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {emp.title}
              </div>
            </div>
            <DeptChip dept={emp.department} />
            <StatusBadge emp={emp} />
            <div
              style={{
                width: "100%",
                borderTop: "1px solid var(--content-border)",
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <InfoRow label="Joined" value={emp.joined} />
              <InfoRow label="Reports to" value={emp.reportsTo} />
            </div>

            {/* Leave balances */}
            <div
              style={{
                width: "100%",
                borderTop: "1px solid var(--content-border)",
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Leave Balance
              </div>
              <LeaveBalanceBar
                label="Vacation"
                remaining={emp.vacationBalance}
                total={15}
                color="#6C47FF"
              />
              <LeaveBalanceBar
                label="Sick"
                remaining={emp.sickBalance}
                total={8}
                color="#EF4444"
              />
              <LeaveBalanceBar
                label="Personal"
                remaining={emp.personalBalance}
                total={5}
                color="#F59E0B"
              />
            </div>
          </div>

          {/* Right: details */}
          <div style={{ padding: "24px", overflowY: "auto" }}>
            {/* Contact */}
            <Section title="Contact Information">
              <InfoRow label="Email" value={emp.email} />
              <InfoRow label="Phone" value={emp.phone} />
              <InfoRow label="Slack" value={emp.slack} />
            </Section>

            {/* Emergency */}
            <Section title="Emergency Contact">
              <InfoRow label="Name" value="On file — confidential" />
              <InfoRow label="Phone" value="On file — confidential" />
            </Section>

            {/* Current tasks */}
            <Section title="Current Tasks">
              <div
                style={{
                  fontSize: 12,
                  color: "var(--vyne-purple)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                View assigned tasks in Projects &rarr;
              </div>
            </Section>

            {/* Documents */}
            <Section title="Documents">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {MOCK_DOCS.map((doc) => (
                  <div
                    key={doc}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      background: "var(--table-header-bg)",
                      borderRadius: 7,
                      border: "1px solid var(--content-border)",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>&#128196;</span>
                    <span
                      style={{ fontSize: 12, color: "var(--text-primary)" }}
                    >
                      {doc}
                    </span>
                    <button
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: "var(--vyne-purple)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: 5,
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
        gap: 8,
      }}
    >
      <span
        style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-primary)",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function LeaveBalanceBar({
  label,
  remaining,
  total,
  color,
}: Readonly<{
  label: string;
  remaining: number;
  total: number;
  color: string;
}>) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {remaining}d
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "#EEE",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(remaining / total) * 100}%`,
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ─── Employees tab ────────────────────────────────────────────────
function EmployeesTab() {
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {EMPLOYEES.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmp(emp)}
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              padding: "18px 16px",
              cursor: "pointer",
              textAlign: "left",
              transition: "box-shadow 0.15s, transform 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 20px rgba(108,71,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
            }}
          >
            <Avatar emp={emp} size={44} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {emp.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {emp.title}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <DeptChip dept={emp.department} />
            </div>
            <StatusBadge emp={emp} />
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {emp.email}
            </div>
          </button>
        ))}
      </div>

      {selectedEmp !== null && (
        <EmployeeModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />
      )}
    </div>
  );
}

// ─── Calendar strip helpers ───────────────────────────────────────
function calendarCellBackground(
  day: number | null,
  hasAbsences: boolean,
): string {
  if (day === null) return "transparent";
  if (hasAbsences) return "rgba(239,68,68,0.08)";
  return "var(--table-header-bg)";
}

function calendarCellBorder(day: number | null): string {
  if (day === null) return "none";
  return "1px solid var(--content-border)";
}

// ─── Calendar strip ───────────────────────────────────────────────
function CalendarStrip() {
  // May 2026: 31 days, starts on Friday (day index 5)
  const daysInMonth = 31;
  const startDayIndex = 5;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const outMap: Record<number, string[]> = {
    28: ["JC"],
    30: ["AR"],
  };

  const cells: Array<{ day: number | null; names: string[]; key: string }> = [];
  for (let i = 0; i < startDayIndex; i++) {
    cells.push({ day: null, names: [], key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, names: outMap[d] ?? [], key: `day-${d}` });
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {dayNames.map((dn) => (
          <div
            key={dn}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              padding: "4px 0",
            }}
          >
            {dn}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {cells.map((cell) => (
          <div
            key={cell.key}
            style={{
              minHeight: 36,
              borderRadius: 6,
              background: calendarCellBackground(
                cell.day,
                cell.names.length > 0,
              ),
              border: calendarCellBorder(cell.day),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "3px 0",
            }}
          >
            {cell.day !== null && (
              <>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {cell.day}
                </span>
                {cell.names.map((n) => (
                  <span
                    key={n}
                    style={{
                      fontSize: 9,
                      background: "var(--status-danger)",
                      color: "#fff",
                      borderRadius: 3,
                      padding: "1px 3px",
                      marginTop: 1,
                    }}
                  >
                    {n}
                  </span>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leave tab helpers ────────────────────────────────────────────
function leaveRequestBackground(status: LeaveRequestStatus): string {
  if (status === "Pending") return "var(--content-secondary)";
  if (status === "Approved") return "#F0FDF4";
  return "#FEF2F2";
}

function leaveTypeBadgeBackground(type: string): string {
  if (type === "Vacation") return "rgba(108,71,255,0.1)";
  if (type === "Sick") return "rgba(239,68,68,0.1)";
  return "rgba(245,158,11,0.1)";
}

function leaveTypeBadgeColor(type: string): string {
  if (type === "Vacation") return "var(--vyne-purple)";
  if (type === "Sick") return "var(--status-danger)";
  return "var(--status-warning)";
}

function resolvedStatusColor(status: LeaveRequestStatus): string {
  if (status === "Approved") return "#166534";
  return "#991B1B";
}

// ─── Leave tab ────────────────────────────────────────────────────
function LeaveTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>(
    INITIAL_LEAVE_REQUESTS,
  );

  function resolveRequest(id: string, action: "Approved" | "Rejected") {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: action } : r)),
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "Pending");

  return (
    <div style={{ padding: 20, overflowY: "auto" }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}
      >
        {/* Left: balances + requests */}
        <div>
          {/* Balances table */}
          <div
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Leave Balances
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg)" }}>
                  {[
                    "Employee",
                    "Vacation",
                    "Sick",
                    "Personal",
                    "Used This Year",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp) => (
                  <tr
                    key={emp.id}
                    style={{ borderTop: "1px solid var(--content-border)" }}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Avatar emp={emp} size={24} />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--vyne-purple)",
                        fontWeight: 600,
                      }}
                    >
                      {emp.vacationBalance}d
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--status-danger)",
                        fontWeight: 600,
                      }}
                    >
                      {emp.sickBalance}d
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--status-warning)",
                        fontWeight: 600,
                      }}
                    >
                      {emp.personalBalance}d
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {emp.usedLeaveThisYear}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending requests */}
          <div
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--content-border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Leave Requests
              </span>
              {pendingRequests.length > 0 && (
                <span
                  style={{
                    background: "var(--vyne-purple)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 20,
                  }}
                >
                  {pendingRequests.length} pending
                </span>
              )}
            </div>
            <div
              style={{
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--content-border)",
                    background: leaveRequestBackground(req.status),
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
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {req.employeeName}
                      </span>
                      <span
                        style={{
                          padding: "1px 7px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 500,
                          background: leaveTypeBadgeBackground(req.type),
                          color: leaveTypeBadgeColor(req.type),
                        }}
                      >
                        {req.type}
                      </span>
                    </div>
                    {req.status === "Pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => resolveRequest(req.id, "Approved")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "none",
                            background: "var(--status-success)",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveRequest(req.id, "Rejected")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid #EF4444",
                            background: "transparent",
                            color: "var(--status-danger)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {(req.status === "Approved" ||
                      req.status === "Rejected") && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: resolvedStatusColor(req.status),
                        }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {req.dates}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 3,
                    }}
                  >
                    {req.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: calendar */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            May 2026 — Who&apos;s Out
          </div>
          <CalendarStrip />
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              background: "var(--badge-danger-bg)",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.12)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--badge-danger-text)",
                marginBottom: 6,
              }}
            >
              Absences this month
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 3,
              }}
            >
              JC — James Chen (May 28)
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 3,
              }}
            >
              AR — Alex Rhodes (May 30)
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              LP — Lisa Park (back Jun 1)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payroll tab ──────────────────────────────────────────────────
function PayrollTab() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [payrollRun, setPayrollRun] = useState(false);
  const [toast, setToast] = useState("");

  function runPayroll() {
    setPayrollRun(true);
    setShowConfirm(false);
    setToast("Payroll for May 2026 processed successfully.");
    setTimeout(() => setToast(""), 3500);
  }

  function downloadPayslips() {
    setToast("Generating payslips for 8 employees...");
    setTimeout(() => setToast(""), 3000);
  }

  const totalBase = EMPLOYEES.reduce(
    (s, e) => s + Math.round(e.baseSalary / 12),
    0,
  );
  const totalDeductions = EMPLOYEES.reduce((s, e) => s + e.deductions, 0);
  const totalBonus = EMPLOYEES.reduce((s, e) => s + e.bonus, 0);
  const totalNet = EMPLOYEES.reduce((s, e) => s + fmtNetPay(e), 0);

  const ytdTotal = totalNet * 5;
  const avgSalary = Math.round(
    EMPLOYEES.reduce((s, e) => s + e.baseSalary, 0) / EMPLOYEES.length,
  );

  return (
    <div style={{ padding: 20, overflowY: "auto" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Payroll — May 2026
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              margin: "3px 0 0",
            }}
          >
            8 employees · next run Jun 1
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={downloadPayslips}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Download Payslips
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: payrollRun
                ? "var(--status-success)"
                : "var(--vyne-purple)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {payrollRun ? "Payroll Run ✓" : "Run Payroll — May 2026"}
          </button>
        </div>
      </div>

      {/* YTD summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Payroll YTD",
            value: `$${ytdTotal.toLocaleString()}`,
          },
          { label: "Average Salary", value: `$${avgSalary.toLocaleString()}` },
          { label: "Headcount", value: "8 employees" },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--table-header-bg)",
              borderRadius: 10,
              padding: "14px 16px",
              border: "1px solid var(--content-border)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Payroll table */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {[
                "Employee",
                "Base Salary",
                "Hours",
                "Deductions",
                "Bonus",
                "Net Pay",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((emp) => {
              const monthlySalary = Math.round(emp.baseSalary / 12);
              const netPay = fmtNetPay(emp);
              return (
                <tr
                  key={emp.id}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                >
                  <td style={{ padding: "11px 16px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Avatar emp={emp} size={28} />
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {emp.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {emp.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmtSalary(monthlySalary)}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {emp.hoursThisMonth}h
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      color: "var(--status-danger)",
                    }}
                  >
                    -{fmtSalary(emp.deductions)}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      color:
                        emp.bonus > 0
                          ? "var(--status-success)"
                          : "var(--text-tertiary)",
                      fontWeight: emp.bonus > 0 ? 600 : 400,
                    }}
                  >
                    {emp.bonus > 0 ? `+${fmtSalary(emp.bonus)}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmtSalary(netPay)}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr
              style={{
                borderTop: "2px solid rgba(0,0,0,0.1)",
                background: "var(--table-header-bg)",
              }}
            >
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Total
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {fmtSalary(totalBase)}
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                —
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--status-danger)",
                }}
              >
                -{fmtSalary(totalDeductions)}
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--status-success)",
                }}
              >
                +{fmtSalary(totalBonus)}
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--vyne-purple)",
                }}
              >
                {fmtSalary(totalNet)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
          }}
        >
          <div
            style={{
              background: "var(--content-bg)",
              borderRadius: 14,
              width: 420,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Confirm Payroll Run
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              You are about to run payroll for <strong>8 employees</strong> for{" "}
              <strong>May 2026</strong>. Total net payout:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {fmtSalary(totalNet)}
              </strong>
              . This action cannot be undone.
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={runPayroll}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--status-success)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Confirm &amp; Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast !== "" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--status-success)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
            zIndex: 400,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Org chart node ───────────────────────────────────────────────
function OrgNode({ emp }: Readonly<{ emp: Employee }>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "14px 16px",
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        minWidth: 120,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <Avatar emp={emp} size={40} />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {emp.name}
        </div>
        <div
          style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}
        >
          {emp.title}
        </div>
      </div>
    </div>
  );
}

// ─── Org chart tab ────────────────────────────────────────────────
function OrgChartTab() {
  const ceo = EMPLOYEES.find((e) => e.id === "e1") ?? EMPLOYEES[0];
  const reports = EMPLOYEES.filter((e) => e.reportsTo === "Preet Raval");

  return (
    <div style={{ padding: 32, overflowY: "auto" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 24,
        }}
      >
        Organization Chart
      </div>

      {/* CEO node */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}
      >
        <OrgNode emp={ceo} />
      </div>

      {/* Connector line down */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.12)" }} />
      </div>

      {/* Horizontal bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "12.5%",
            right: "12.5%",
            height: 1,
            background: "rgba(0,0,0,0.12)",
          }}
        />
      </div>

      {/* Direct reports */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: 28,
        }}
      >
        {reports.map((emp) => {
          const subReports = EMPLOYEES.filter((e) => e.reportsTo === emp.name);
          return (
            <div
              key={emp.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
              }}
            >
              {/* Vertical line above */}
              <div
                style={{ width: 1, height: 28, background: "rgba(0,0,0,0.12)" }}
              />
              <OrgNode emp={emp} />
              {/* Sub-reports */}
              {subReports.length > 0 && (
                <>
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "rgba(0,0,0,0.12)",
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    {subReports.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 1,
                            height: 20,
                            background: "rgba(0,0,0,0.12)",
                          }}
                        />
                        <OrgNode emp={sub} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main HR page ─────────────────────────────────────────────────
export default function HRPage() {
  const [tab, setTab] = useState<HRTab>("employees");

  const tabLabels: { key: HRTab; label: string }[] = [
    { key: "employees", label: "Employees" },
    { key: "leave", label: "Leave" },
    { key: "payroll", label: "Payroll" },
    { key: "orgchart", label: "Org Chart" },
  ];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px 0",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              HR
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "2px 0 0",
              }}
            >
              {EMPLOYEES.length} employees ·{" "}
              {EMPLOYEES.filter((e) => e.status === "Active").length} active
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                color: "var(--badge-success-text)",
              }}
            >
              {EMPLOYEES.filter((e) => e.status === "Active").length} Active
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(59,130,246,0.1)",
                color: "#1E40AF",
              }}
            >
              {EMPLOYEES.filter((e) => e.status === "Remote").length} Remote
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(245,158,11,0.1)",
                color: "var(--badge-warning-text)",
              }}
            >
              {EMPLOYEES.filter((e) => e.status === "On Leave").length} On Leave
            </span>
            <ExportButton
              data={EMPLOYEES as unknown as Record<string, unknown>[]}
              filename="vyne-employees"
              columns={[
                { key: "name", header: "Name" },
                { key: "title", header: "Title" },
                { key: "department", header: "Department" },
                { key: "status", header: "Status" },
                { key: "email", header: "Email" },
                { key: "phone", header: "Phone" },
                { key: "joined", header: "Joined" },
                { key: "baseSalary", header: "Base Salary" },
              ]}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {tabLabels.map(({ key, label }) => (
            <TabBtn
              key={key}
              label={label}
              active={tab === key}
              onClick={() => setTab(key)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {tab === "employees" && <EmployeesTab />}
        {tab === "leave" && <LeaveTab />}
        {tab === "payroll" && <PayrollTab />}
        {tab === "orgchart" && <OrgChartTab />}
      </div>
    </div>
  );
}
