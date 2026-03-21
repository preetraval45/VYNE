'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader2 } from 'lucide-react'
import type { Issue, IssueStatus, Project } from '@/types'
import { STATUS_META } from '@/types'
import { IssueCard } from './IssueCard'
import { useCreateIssue, useReorderIssues } from '@/hooks/useIssues'
import { useQueryClient } from '@tanstack/react-query'
import { issueKeys } from '@/hooks/useIssues'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const COLUMN_ORDER: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

interface IssueKanbanProps {
  project: Project
  issues: Issue[]
  showCreateIssue?: boolean
  createIssueStatus?: IssueStatus
  onCreateIssueClose?: () => void
}

interface InlineCreateState {
  columnId: IssueStatus | null
  title: string
}

export function IssueKanban({
  project,
  issues,
  showCreateIssue = false,
  createIssueStatus = 'todo',
  onCreateIssueClose,
}: IssueKanbanProps) {
  const queryClient = useQueryClient()
  const createIssue = useCreateIssue()
  const reorderIssues = useReorderIssues()

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [inlineCreate, setInlineCreate] = useState<InlineCreateState>({
    columnId: showCreateIssue ? createIssueStatus : null,
    title: '',
  })

  // Initialize inline create from prop
  useEffect(() => {
    if (showCreateIssue) {
      setInlineCreate({ columnId: createIssueStatus, title: '' })
    }
  }, [showCreateIssue, createIssueStatus])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group issues by status
  const columns = COLUMN_ORDER.map((status) => ({
    id: status,
    meta: STATUS_META[status],
    issues: issues
      .filter((i) => i.status === status)
      .sort((a, b) => a.order - b.order),
  }))

  function handleDragStart(event: DragStartEvent) {
    const issue = issues.find((i) => i.id === event.active.id)
    if (issue) setActiveIssue(issue)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id?.toString() ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null)
    setOverId(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedIssue = issues.find((i) => i.id === active.id)
    if (!draggedIssue) return

    // Determine target status (column or issue card)
    let targetStatus: IssueStatus = draggedIssue.status
    let targetOrder = draggedIssue.order

    const overIssue = issues.find((i) => i.id === over.id)
    if (overIssue) {
      targetStatus = overIssue.status
      targetOrder = overIssue.order
    } else if (COLUMN_ORDER.includes(over.id as IssueStatus)) {
      targetStatus = over.id as IssueStatus
      const colIssues = issues.filter((i) => i.status === targetStatus)
      targetOrder = colIssues.length > 0 ? Math.max(...colIssues.map((i) => i.order)) + 1 : 0
    }

    if (targetStatus === draggedIssue.status && targetOrder === draggedIssue.order) return

    // Optimistic update
    queryClient.setQueryData<Issue[]>(
      issueKeys.byProject(project.id),
      (old) => old?.map((issue) =>
        issue.id === draggedIssue.id
          ? { ...issue, status: targetStatus, order: targetOrder }
          : issue
      )
    )

    // Persist
    reorderIssues.mutate({
      projectId: project.id,
      updates: [{ id: draggedIssue.id, status: targetStatus, order: targetOrder }],
    })
  }

  async function handleCreateIssue(status: IssueStatus, title: string) {
    if (!title.trim()) {
      setInlineCreate({ columnId: null, title: '' })
      onCreateIssueClose?.()
      return
    }

    try {
      await createIssue.mutateAsync({
        projectId: project.id,
        title: title.trim(),
        status,
        priority: 'medium',
      })
      toast.success('Issue created')
    } catch {
      toast.error('Failed to create issue')
    } finally {
      setInlineCreate({ columnId: null, title: '' })
      onCreateIssueClose?.()
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-3 h-full overflow-x-auto px-6 py-4"
        style={{ minWidth: 'max-content', alignItems: 'flex-start' }}
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            columnId={column.id}
            label={column.meta.label}
            color={column.meta.color}
            bgColor={column.meta.bgColor}
            issues={column.issues}
            overId={overId}
            inlineCreate={inlineCreate}
            onAddIssue={() =>
              setInlineCreate({ columnId: column.id, title: '' })
            }
            onInlineCreateSubmit={(title) => handleCreateIssue(column.id, title)}
            onInlineCreateChange={(title) =>
              setInlineCreate((prev) => ({ ...prev, title }))
            }
            onInlineCreateCancel={() => {
              setInlineCreate({ columnId: null, title: '' })
              onCreateIssueClose?.()
            }}
            isCreating={createIssue.isPending}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeIssue ? (
          <div className="rotate-2 opacity-90 w-[272px]">
            <IssueCard issue={activeIssue} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Kanban Column ───────────────────────────────────────────────

interface KanbanColumnProps {
  columnId: IssueStatus
  label: string
  color: string
  bgColor: string
  issues: Issue[]
  overId: string | null
  inlineCreate: InlineCreateState
  onAddIssue: () => void
  onInlineCreateSubmit: (title: string) => void
  onInlineCreateChange: (title: string) => void
  onInlineCreateCancel: () => void
  isCreating: boolean
}

function KanbanColumn({
  columnId,
  label,
  color,
  bgColor,
  issues,
  overId,
  inlineCreate,
  onAddIssue,
  onInlineCreateSubmit,
  onInlineCreateChange,
  onInlineCreateCancel,
  isCreating,
}: KanbanColumnProps) {
  const showInlineCreate = inlineCreate.columnId === columnId
  const isOver = overId === columnId

  return (
    <div
      className={cn(
        'kanban-col flex flex-col rounded-xl transition-colors',
        isOver && 'ring-2'
      )}
      style={{
        width: '272px',
        minWidth: '272px',
        background: isOver ? bgColor : '#F8F8FC',
        ringColor: color,
        border: isOver ? `1px solid ${color}40` : '1px solid transparent',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between px-3.5 py-3 rounded-t-xl"
        style={{ borderBottom: `2px solid ${color}30` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>
            {label}
          </span>
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: bgColor, color }}
          >
            {issues.length}
          </span>
        </div>
        <button
          onClick={onAddIssue}
          className="p-1 rounded-lg transition-colors"
          style={{ color: '#A0A0B8' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#EEEEF8'
            ;(e.currentTarget as HTMLElement).style.color = color
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#A0A0B8'
          }}
          title={`Add issue to ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Issues list */}
      <SortableContext
        id={columnId}
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 p-2 flex-1 min-h-[60px]">
          <AnimatePresence mode="popLayout">
            {issues.map((issue) => (
              <motion.div
                key={issue.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <IssueCard issue={issue} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Inline Create */}
          <AnimatePresence>
            {showInlineCreate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className="p-2.5 rounded-lg"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #6C47FF',
                    boxShadow: '0 0 0 3px rgba(108,71,255,0.08)',
                  }}
                >
                  <textarea
                    autoFocus
                    value={inlineCreate.title}
                    onChange={(e) => onInlineCreateChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        onInlineCreateSubmit(inlineCreate.title)
                      }
                      if (e.key === 'Escape') {
                        onInlineCreateCancel()
                      }
                    }}
                    placeholder="Issue title…"
                    rows={2}
                    className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-[#C0C0D8]"
                    style={{ color: '#1A1A2E' }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onInlineCreateSubmit(inlineCreate.title)}
                      disabled={!inlineCreate.title.trim() || isCreating}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: '#6C47FF' }}
                    >
                      {isCreating ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : null}
                      Create
                    </button>
                    <button
                      onClick={onInlineCreateCancel}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: '#6B6B8A', background: '#F0F0F8' }}
                    >
                      Cancel
                    </button>
                    <span className="text-xs ml-auto" style={{ color: '#C0C0D8' }}>
                      ↵ to create
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SortableContext>

      {/* Add issue button at bottom */}
      {!showInlineCreate && (
        <button
          onClick={onAddIssue}
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors rounded-b-xl"
          style={{ color: '#A0A0B8' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#EEEEF8'
            ;(e.currentTarget as HTMLElement).style.color = '#6C47FF'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#A0A0B8'
          }}
        >
          <Plus size={13} />
          Add issue
        </button>
      )}
    </div>
  )
}
