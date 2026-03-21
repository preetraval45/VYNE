'use client'

import { useState } from 'react'
import { use } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Loader2,
  Settings,
  Users,
  SlidersHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { useProject } from '@/hooks/useProjects'
import { useIssues } from '@/hooks/useIssues'
import { useSocket } from '@/hooks/useSocket'
import { IssueKanban } from '@/components/projects/IssueKanban'
import { FilterBar } from '@/components/projects/FilterBar'
import type { FilterState, IssueStatus, IssuePriority } from '@/types'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params)
  const [filters, setFilters] = useState<FilterState>({})
  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [createIssueStatus, setCreateIssueStatus] = useState<IssueStatus>('todo')

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: issues, isLoading: issuesLoading } = useIssues(projectId, filters)

  // Real-time updates
  useSocket(projectId)

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: '#6C47FF' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="font-semibold text-lg mb-2" style={{ color: '#1A1A2E' }}>
          Project not found
        </h3>
        <p className="text-sm mb-4" style={{ color: '#A0A0B8' }}>
          This project may have been deleted or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#6C47FF' }}
        >
          <ArrowLeft size={14} />
          Back to projects
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Topbar ──────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
        style={{
          borderBottom: '1px solid #E8E8F0',
          background: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#A0A0B8' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#F8F8FC'
              ;(e.currentTarget as HTMLElement).style.color = '#1A1A2E'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#A0A0B8'
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
              style={{ background: project.color + '20' }}
            >
              {project.icon ?? '📋'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold" style={{ color: '#1A1A2E' }}>
                  {project.name}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold"
                  style={{ background: '#F0F0F8', color: '#6B6B8A' }}
                >
                  {project.identifier}
                </span>
              </div>
              {project.description && (
                <p className="text-xs" style={{ color: '#A0A0B8' }}>
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Members */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: '#6B6B8A', background: '#F8F8FC', border: '1px solid #E8E8F0' }}
          >
            <Users size={14} />
            Members
          </button>

          {/* Filter */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: '#6B6B8A', background: '#F8F8FC', border: '1px solid #E8E8F0' }}
          >
            <SlidersHorizontal size={14} />
            Filter
          </button>

          {/* Settings */}
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#6B6B8A' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#F8F8FC'
              ;(e.currentTarget as HTMLElement).style.color = '#1A1A2E'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#6B6B8A'
            }}
          >
            <Settings size={16} />
          </button>

          {/* More */}
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#6B6B8A' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#F8F8FC'
              ;(e.currentTarget as HTMLElement).style.color = '#1A1A2E'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#6B6B8A'
            }}
          >
            <MoreHorizontal size={16} />
          </button>

          {/* New Issue */}
          <button
            onClick={() => {
              setCreateIssueStatus('todo')
              setShowCreateIssue(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)',
              boxShadow: '0 2px 8px rgba(108,71,255,0.3)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(108,71,255,0.45)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(108,71,255,0.3)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
            }}
          >
            <Plus size={16} />
            New Issue
          </button>
        </div>
      </header>

      {/* ─── Filter Bar ──────────────────────────────── */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* ─── Kanban Board ────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {issuesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin" style={{ color: '#6C47FF' }} />
          </div>
        ) : (
          <IssueKanban
            project={project}
            issues={issues ?? []}
            showCreateIssue={showCreateIssue}
            createIssueStatus={createIssueStatus}
            onCreateIssueClose={() => setShowCreateIssue(false)}
          />
        )}
      </div>
    </div>
  )
}
