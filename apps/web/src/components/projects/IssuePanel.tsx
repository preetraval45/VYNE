'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ExternalLink,
  MoreHorizontal,
  Send,
  Loader2,
  Clock,
  User,
  Tag,
  Calendar,
  Flag,
} from 'lucide-react'
import type { Issue, IssueStatus, IssuePriority } from '@/types'
import { STATUS_META, PRIORITY_META } from '@/types'
import { useUpdateIssue } from '@/hooks/useIssues'
import { StatusPicker, PriorityPicker, AssigneePicker } from './IssuePicker'
import { cn, formatDate, formatRelativeTime, getInitials, stringToColor } from '@/lib/utils'
import { issuesApi } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface IssuePanelProps {
  issue: Issue
  open: boolean
  onClose: () => void
}

export function IssuePanel({ issue, open, onClose }: IssuePanelProps) {
  const updateIssue = useUpdateIssue()

  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [localComments, setLocalComments] = useState(issue.comments ?? [])
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Sync when issue changes
  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description ?? '')
    setLocalComments(issue.comments ?? [])
  }, [issue])

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [title])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  async function handleTitleBlur() {
    if (title.trim() && title !== issue.title) {
      await updateIssue.mutateAsync({
        id: issue.id,
        projectId: issue.projectId,
        data: { title: title.trim() },
      })
    }
  }

  async function handleDescriptionBlur() {
    if (description !== (issue.description ?? '')) {
      await updateIssue.mutateAsync({
        id: issue.id,
        projectId: issue.projectId,
        data: { description: description || undefined },
      })
    }
  }

  async function handleStatusChange(status: IssueStatus) {
    await updateIssue.mutateAsync({
      id: issue.id,
      projectId: issue.projectId,
      data: { status },
    })
  }

  async function handlePriorityChange(priority: IssuePriority) {
    await updateIssue.mutateAsync({
      id: issue.id,
      projectId: issue.projectId,
      data: { priority },
    })
  }

  async function handleAssigneeChange(assigneeId: string | null) {
    await updateIssue.mutateAsync({
      id: issue.id,
      projectId: issue.projectId,
      data: { assigneeId: assigneeId ?? undefined },
    })
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmittingComment(true)
    try {
      const response = await issuesApi.addComment(issue.id, commentText.trim())
      setLocalComments((prev) => [...prev, response.data])
      setCommentText('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const statusMeta = STATUS_META[issue.status]
  const priorityMeta = PRIORITY_META[issue.priority]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 'min(560px, 90vw)',
              background: '#FFFFFF',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              borderLeft: '1px solid #E8E8F0',
            }}
          >
            {/* ─── Header ────────────────────────────── */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid #E8E8F0' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{ background: '#F0F0F8', color: '#6B6B8A' }}
                >
                  {issue.identifier}
                </span>
                {updateIssue.isPending && (
                  <Loader2 size={12} className="animate-spin" style={{ color: '#A0A0B8' }} />
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
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
                  <ExternalLink size={14} />
                </button>
                <button
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
                  <MoreHorizontal size={14} />
                </button>
                <button
                  onClick={onClose}
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
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ─── Body ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto content-scroll">
              {/* Main content */}
              <div className="px-5 pt-5 pb-4">
                {/* Title */}
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full bg-transparent text-xl font-semibold resize-none focus:outline-none leading-snug"
                  style={{ color: '#1A1A2E', minHeight: '32px' }}
                  rows={1}
                />

                {/* Properties Grid */}
                <div
                  className="mt-5 space-y-3"
                  style={{
                    borderTop: '1px solid #F0F0F8',
                    paddingTop: '16px',
                  }}
                >
                  <PropertyRow icon={<Flag size={13} />} label="Status">
                    <StatusPicker value={issue.status} onChange={handleStatusChange} />
                  </PropertyRow>

                  <PropertyRow icon={<Flag size={13} />} label="Priority">
                    <PriorityPicker value={issue.priority} onChange={handlePriorityChange} />
                  </PropertyRow>

                  <PropertyRow icon={<User size={13} />} label="Assignee">
                    <AssigneePicker
                      value={issue.assigneeId}
                      users={issue.assignee ? [issue.assignee] : []}
                      onChange={handleAssigneeChange}
                    />
                  </PropertyRow>

                  {issue.dueDate && (
                    <PropertyRow icon={<Calendar size={13} />} label="Due date">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-lg"
                        style={{
                          background: new Date(issue.dueDate) < new Date() ? '#FEF2F2' : '#F8F8FC',
                          color: new Date(issue.dueDate) < new Date() ? '#EF4444' : '#6B6B8A',
                        }}
                      >
                        {formatDate(issue.dueDate)}
                      </span>
                    </PropertyRow>
                  )}

                  {issue.labels?.length > 0 && (
                    <PropertyRow icon={<Tag size={13} />} label="Labels">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={label.id}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: label.color + '20',
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    </PropertyRow>
                  )}

                  <PropertyRow icon={<Clock size={13} />} label="Created">
                    <span className="text-xs" style={{ color: '#6B6B8A' }}>
                      {formatRelativeTime(issue.createdAt)}
                    </span>
                  </PropertyRow>
                </div>

                {/* Description */}
                <div className="mt-5">
                  <label className="block text-xs font-medium mb-2" style={{ color: '#A0A0B8' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Add a description…"
                    rows={5}
                    className={cn(
                      'w-full p-3 rounded-lg text-sm resize-none focus:outline-none transition-all',
                      'placeholder:text-[#C0C0D8]'
                    )}
                    style={{
                      background: '#F8F8FC',
                      border: '1px solid #E8E8F0',
                      color: '#1A1A2E',
                      lineHeight: '1.6',
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid #6C47FF'
                      e.target.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.08)'
                    }}
                    onBlur={(e) => {
                      handleDescriptionBlur()
                      e.target.style.border = '1px solid #E8E8F0'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* ─── Comments ──────────────────────────── */}
              <div
                className="px-5 pt-4 pb-4"
                style={{ borderTop: '1px solid #F0F0F8' }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0A0B8' }}>
                  Comments ({localComments.length})
                </h3>

                {localComments.length > 0 ? (
                  <div className="space-y-4 mb-4">
                    {localComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {comment.author?.avatarUrl ? (
                          <img
                            src={comment.author.avatarUrl}
                            alt={comment.author.name}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                            style={{
                              background: comment.author
                                ? stringToColor(comment.author.name)
                                : '#6C47FF',
                            }}
                          >
                            {comment.author ? getInitials(comment.author.name) : '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: '#1A1A2E' }}>
                              {comment.author?.name ?? 'Unknown'}
                            </span>
                            <span className="text-xs" style={{ color: '#A0A0B8' }}>
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: '#4A4A6A' }}
                          >
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: '#C0C0D8' }}>
                    No comments yet
                  </p>
                )}

                {/* Comment input */}
                <form onSubmit={handleSubmitComment} className="flex gap-2 items-end">
                  <div
                    className="flex-1 rounded-lg overflow-hidden"
                    style={{ border: '1px solid #E8E8F0' }}
                  >
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Leave a comment…"
                      rows={2}
                      className="w-full p-3 text-sm bg-transparent resize-none focus:outline-none placeholder:text-[#C0C0D8]"
                      style={{ color: '#1A1A2E' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSubmitComment(e as unknown as React.FormEvent)
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="p-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#6C47FF', color: '#FFFFFF' }}
                  >
                    {submittingComment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
                <p className="text-xs mt-1.5" style={{ color: '#C0C0D8' }}>
                  ⌘ + Enter to submit
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Property Row helper ─────────────────────────────────────────
function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5 w-24 flex-shrink-0 text-xs"
        style={{ color: '#A0A0B8' }}
      >
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}
