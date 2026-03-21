'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { FilterState, IssueStatus, IssuePriority } from '@/types'
import { STATUS_META, PRIORITY_META } from '@/types'

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  )

  function toggleStatus(status: IssueStatus) {
    const current = filters.status ?? []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onChange({ ...filters, status: updated.length > 0 ? updated : undefined })
  }

  function togglePriority(priority: IssuePriority) {
    const current = filters.priority ?? []
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority]
    onChange({ ...filters, priority: updated.length > 0 ? updated : undefined })
  }

  function clearAll() {
    onChange({})
  }

  if (!hasActiveFilters) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-6 py-2.5 overflow-x-auto"
      style={{
        borderBottom: '1px solid #E8E8F0',
        background: '#FAFAFE',
      }}
    >
      <SlidersHorizontal size={13} style={{ color: '#A0A0B8', flexShrink: 0 }} />
      <span className="text-xs font-medium flex-shrink-0" style={{ color: '#6B6B8A' }}>
        Filters:
      </span>

      {/* Status filters */}
      {filters.status?.map((status) => {
        const meta = STATUS_META[status]
        return (
          <FilterPill
            key={`status-${status}`}
            label={meta.label}
            color={meta.color}
            bg={meta.bgColor}
            onRemove={() => toggleStatus(status)}
          />
        )
      })}

      {/* Priority filters */}
      {filters.priority?.map((priority) => {
        const meta = PRIORITY_META[priority]
        return (
          <FilterPill
            key={`priority-${priority}`}
            label={meta.label}
            color={meta.color}
            bg={meta.color + '18'}
            onRemove={() => togglePriority(priority)}
          />
        )
      })}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="ml-1 text-xs font-medium transition-colors flex-shrink-0"
          style={{ color: '#6C47FF' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#5235CC')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#6C47FF')}
        >
          Clear all
        </button>
      )}
    </motion.div>
  )
}

function FilterPill({
  label,
  color,
  bg,
  onRemove,
}: {
  label: string
  color: string
  bg: string
  onRemove: () => void
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
      style={{ background: bg, color }}
    >
      {label}
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 transition-colors hover:bg-black/10"
      >
        <X size={10} />
      </button>
    </motion.span>
  )
}
