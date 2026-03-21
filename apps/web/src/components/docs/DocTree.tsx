'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronRight, FileText, MoreHorizontal, Plus, Trash2, Edit2, FilePlus } from 'lucide-react'
import type { Document } from '@/types'

interface DocTreeProps {
  docs: Document[]
  allDocs: Document[]
  activeDocId?: string
  depth?: number
  onSelect: (id: string) => void
  onCreateChild: (parentId: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onCreateRoot: () => void
}

interface MenuState {
  docId: string
  x: number
  y: number
}

export function DocTree({
  docs,
  allDocs,
  activeDocId,
  depth = 0,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
  onCreateRoot,
}: DocTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [renamingId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    if (menu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menu])

  function getChildren(parentId: string) {
    return allDocs.filter((d) => d.parentId === parentId)
  }

  function handleMenuOpen(e: React.MouseEvent, docId: string) {
    e.stopPropagation()
    setMenu({ docId, x: e.clientX, y: e.clientY })
  }

  function handleRenameStart(doc: Document) {
    setMenu(null)
    setRenamingId(doc.id)
    setRenameValue(doc.title)
  }

  function handleRenameCommit() {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRenameCommit()
    if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const paddingLeft = depth * 16 + 8

  return (
    <div>
      {docs.map((doc) => {
        const children = getChildren(doc.id)
        const hasChildren = children.length > 0
        const isExpanded = expanded[doc.id]
        const isActive = activeDocId === doc.id

        return (
          <div key={doc.id}>
            <div
              className="group flex items-center gap-1 py-[3px] px-1 rounded-md cursor-pointer select-none"
              style={{
                paddingLeft,
                background: isActive ? 'rgba(108,71,255,0.08)' : undefined,
              }}
              onClick={() => onSelect(doc.id)}
            >
              {/* Expand/collapse toggle */}
              <button
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-black/[0.06] transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) toggleExpand(doc.id)
                  else onCreateChild(doc.id)
                }}
              >
                {hasChildren ? (
                  <ChevronRight
                    size={12}
                    className="text-[#A0A0B8] transition-transform"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}
                  />
                ) : (
                  <span className="text-[10px] text-[#A0A0B8] opacity-0 group-hover:opacity-100">
                    <ChevronRight size={12} className="opacity-0" />
                  </span>
                )}
              </button>

              {/* Icon */}
              <span className="text-[14px] w-5 flex-shrink-0 text-center leading-none">
                {doc.icon ?? '📄'}
              </span>

              {/* Title / rename input */}
              {renamingId === doc.id ? (
                <input
                  ref={renameRef}
                  className="flex-1 min-w-0 text-[13px] bg-white border border-[#6C47FF] rounded px-1 py-0 outline-none"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameCommit}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-[13px] truncate"
                  style={{
                    color: isActive ? '#1A1A2E' : '#3A3A5A',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {doc.title}
                </span>
              )}

              {/* Actions (show on hover) */}
              <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06]"
                  onClick={(e) => { e.stopPropagation(); onCreateChild(doc.id); toggleExpand(doc.id) }}
                  title="Add child page"
                >
                  <Plus size={11} className="text-[#A0A0B8]" />
                </button>
                <button
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06]"
                  onClick={(e) => handleMenuOpen(e, doc.id)}
                  title="More options"
                >
                  <MoreHorizontal size={11} className="text-[#A0A0B8]" />
                </button>
              </div>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
              <DocTree
                docs={children}
                allDocs={allDocs}
                activeDocId={activeDocId}
                depth={depth + 1}
                onSelect={onSelect}
                onCreateChild={onCreateChild}
                onRename={onRename}
                onDelete={onDelete}
                onCreateRoot={onCreateRoot}
              />
            )}
          </div>
        )
      })}

      {/* New Page button at root level */}
      {depth === 0 && (
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md text-[12px] text-[#A0A0B8] hover:text-[#6C47FF] hover:bg-[rgba(108,71,255,0.06)] transition-colors"
          onClick={onCreateRoot}
        >
          <Plus size={14} />
          New Page
        </button>
      )}

      {/* Context Menu */}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-panel border border-[#E8E8F0] py-1 min-w-[160px]"
          style={{ left: menu.x, top: menu.y }}
        >
          {(() => {
            const doc = allDocs.find((d) => d.id === menu.docId)
            if (!doc) return null
            return (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#3A3A5A] hover:bg-[#F8F8FC] text-left"
                  onClick={() => { setMenu(null); onCreateChild(doc.id) }}
                >
                  <FilePlus size={13} className="text-[#A0A0B8]" />
                  Add child page
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#3A3A5A] hover:bg-[#F8F8FC] text-left"
                  onClick={() => handleRenameStart(doc)}
                >
                  <Edit2 size={13} className="text-[#A0A0B8]" />
                  Rename
                </button>
                <div className="border-t border-[#E8E8F0] my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-red-500 hover:bg-red-50 text-left"
                  onClick={() => { setMenu(null); onDelete(doc.id) }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
