'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LayoutGrid, Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid #E8E8F0',
          background: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(108,71,255,0.08)' }}
          >
            <LayoutGrid size={18} style={{ color: '#6C47FF' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>
              Projects
            </h1>
            <p className="text-xs" style={{ color: '#A0A0B8' }}>
              {projects?.length ?? 0} projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: '#F8F8FC',
              border: '1px solid #E8E8F0',
              width: '220px',
            }}
          >
            <Search size={14} style={{ color: '#A0A0B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: '#1A1A2E' }}
            />
          </div>

          {/* Filter */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: '#F8F8FC',
              border: '1px solid #E8E8F0',
              color: '#6B6B8A',
            }}
          >
            <SlidersHorizontal size={14} />
            Filter
          </button>

          {/* New Project */}
          <button
            onClick={() => setShowCreateModal(true)}
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
            New Project
          </button>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto content-scroll px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin" style={{ color: '#6C47FF' }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-semibold mb-1" style={{ color: '#1A1A2E' }}>
              Failed to load projects
            </h3>
            <p className="text-sm" style={{ color: '#A0A0B8' }}>
              Please check your connection and try again
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(108,71,255,0.08)' }}
            >
              <LayoutGrid size={28} style={{ color: '#6C47FF' }} />
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: '#1A1A2E' }}>
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: '#A0A0B8' }}>
              {search
                ? `No projects match "${search}"`
                : 'Create your first project to start tracking work with your team'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)' }}
              >
                <Plus size={16} />
                Create first project
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <ProjectCard project={project} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ─── Create Modal ──────────────────────────── */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
