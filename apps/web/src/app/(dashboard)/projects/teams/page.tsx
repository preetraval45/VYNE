"use client";

import Link from "next/link";
import { Users, Folder } from "lucide-react";
import { useProjects, useTeamMembers } from "@/lib/stores/projects";
import { ProjectsStatsStrip } from "@/components/projects/ProjectsStatsStrip";
import { PageHeader, EmptyState } from "@/components/shared/Kit";

export default function TeamsPage() {
  const projects = useProjects();
  const members = useTeamMembers();

  const leads = members.filter((m) => projects.some((p) => p.leadId === m.id)).length;
  const assignedCount = members.filter((m) => projects.some((p) => p.memberIds.includes(m.id))).length;
  const avgPerMember =
    members.length > 0
      ? Math.round(
          (projects.reduce((acc, p) => acc + p.memberIds.length, 0) / members.length) * 10,
        ) / 10
      : 0;

  return (
    <div className="flex flex-col h-full">
      <ProjectsStatsStrip
        items={[
          { label: "Members", value: members.length, tone: "teal", hint: "Total teammates" },
          { label: "Leads", value: leads, tone: "default", hint: "Project owners" },
          { label: "Assigned", value: assignedCount, hint: "On a project" },
          { label: "Avg / member", value: avgPerMember, hint: "Projects per person" },
        ]}
      />
      <PageHeader
        icon={<Users size={16} />}
        title="Teams"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"} across ${projects.length} project${projects.length === 1 ? "" : "s"}`}
      />

      <div
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "20px", background: "var(--content-bg-secondary)" }}
      >
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="No team members yet"
            body="Invite teammates from Settings → Members, then assign them to projects to see them here."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {members.map((m) => {
              const memberProjects = projects.filter((p) =>
                p.memberIds.includes(m.id),
              );
              const ledProjects = projects.filter((p) => p.leadId === m.id);
              return (
                <article
                  key={m.id}
                  style={{
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 14,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: m.color,
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {m.initials}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.name}
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12.5,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {m.role ?? "Member"}
                        {ledProjects.length > 0 && (
                          <>
                            {" · "}
                            <span style={{ color: "var(--vyne-teal)", fontWeight: 600 }}>
                              Lead of {ledProjects.length}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </header>

                  <div>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Projects ({memberProjects.length})
                    </p>
                    {memberProjects.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.5,
                          color: "var(--text-tertiary)",
                          padding: "10px 12px",
                          background: "var(--content-secondary)",
                          borderRadius: 8,
                          border: "1px dashed var(--content-border)",
                        }}
                      >
                        Not assigned to any project yet.
                      </p>
                    ) : (
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {memberProjects.slice(0, 6).map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/projects/${p.id}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 10px",
                                borderRadius: 8,
                                textDecoration: "none",
                                color: "var(--text-primary)",
                                fontSize: 13,
                                background: "var(--content-secondary)",
                                border: "1px solid var(--content-border)",
                              }}
                            >
                              <span aria-hidden="true">{p.icon ?? "📋"}</span>
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {p.name}
                              </span>
                              <Folder size={12} style={{ color: "var(--text-tertiary)" }} />
                            </Link>
                          </li>
                        ))}
                        {memberProjects.length > 6 && (
                          <li style={{ fontSize: 11.5, color: "var(--text-tertiary)", padding: "4px 10px" }}>
                            +{memberProjects.length - 6} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
