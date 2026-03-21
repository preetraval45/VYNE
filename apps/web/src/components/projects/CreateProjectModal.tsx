'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { useCreateProject } from '@/hooks/useProjects'
import { cn, generateIdentifier } from '@/lib/utils'
import { PROJECT_COLORS } from '@/types'
import toast from 'react-hot-toast'

const EMOJI_OPTIONS = ['📋', '🚀', '⚡', '🔥', '💎', '🛠️', '🎯', '🌟', '🔬', '🎨', '🏗️', '🤖']

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const createProject = useCreateProject()

  const [form, setForm] = useState({
    name: '',
    identifier: '',
    description: '',
    color: PROJECT_COLORS[0],
    icon: '📋',
  })

  const [identifierEdited, setIdentifierEdited] = useState(false)

  // Auto-generate identifier from name
  useEffect(() => {
    if (!identifierEdited && form.name) {
      setForm((prev) => ({
        ...prev,
        identifier: generateIdentifier(form.name),
      }))
    }
  }, [form.name, identifierEdited])

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        identifier: '',
        description: '',
        color: PROJECT_COLORS[0],
        icon: '📋',
      })
      setIdentifierEdited(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    try {
      await createProject.mutateAsync({
        name: form.name.trim(),
        identifier: form.identifier.trim().toUpperCase() || generateIdentifier(form.name),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
      })
      toast.success(`Project "${form.name}" created!`)
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create project'
      toast.error(msg)
    }
  }

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150',
    'placeholder:text-[#C0C0D8]'
  )

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[500px] rounded-2xl"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
                }}
                aria-describedby="create-project-desc"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: '1px solid #E8E8F0' }}
                >
                  <div>
                    <Dialog.Title className="text-base font-semibold" style={{ color: '#1A1A2E' }}>
                      New Project
                    </Dialog.Title>
                    <p id="create-project-desc" className="text-xs mt-0.5" style={{ color: '#A0A0B8' }}>
                      Set up a new project for your team
                    </p>
                  </div>
                  <Dialog.Close asChild>
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
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {/* Icon + Name row */}
                  <div className="flex gap-3">
                    {/* Icon picker */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B8A' }}>
                        Icon
                      </label>
                      <div className="relative group">
                        <div
                          className="w-[52px] h-[42px] rounded-lg flex items-center justify-center text-xl cursor-pointer transition-colors"
                          style={{
                            background: form.color + '18',
                            border: '1px solid ' + form.color + '40',
                          }}
                        >
                          {form.icon}
                        </div>
                        {/* Emoji dropdown on hover */}
                        <div
                          className="absolute top-full left-0 mt-1 p-2 rounded-xl z-10 hidden group-hover:grid"
                          style={{
                            background: '#FFFFFF',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            border: '1px solid #E8E8F0',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '4px',
                            width: '160px',
                          }}
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors hover:bg-[#F8F8FC]"
                              style={{
                                background: form.icon === emoji ? '#F0EDFF' : 'transparent',
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B8A' }}>
                        Project name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Product Redesign"
                        required
                        autoFocus
                        className={inputClass}
                        style={{
                          background: '#F8F8FC',
                          border: '1px solid #E8E8F0',
                          color: '#1A1A2E',
                        }}
                        onFocus={(e) => {
                          e.target.style.border = '1px solid #6C47FF'
                          e.target.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.08)'
                        }}
                        onBlur={(e) => {
                          e.target.style.border = '1px solid #E8E8F0'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Identifier */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B8A' }}>
                      Identifier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.identifier}
                        onChange={(e) => {
                          setIdentifierEdited(true)
                          setForm((f) => ({
                            ...f,
                            identifier: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
                          }))
                        }}
                        placeholder="AUTO"
                        maxLength={6}
                        className={cn(inputClass, 'font-mono w-24 text-center')}
                        style={{
                          background: '#F8F8FC',
                          border: '1px solid #E8E8F0',
                          color: '#1A1A2E',
                        }}
                        onFocus={(e) => {
                          e.target.style.border = '1px solid #6C47FF'
                          e.target.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.08)'
                        }}
                        onBlur={(e) => {
                          e.target.style.border = '1px solid #E8E8F0'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      <p className="text-xs" style={{ color: '#A0A0B8' }}>
                        Issues will be labeled {form.identifier || 'PROJ'}-1, {form.identifier || 'PROJ'}-2…
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B8A' }}>
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What is this project about?"
                      rows={3}
                      className={cn(inputClass, 'resize-none')}
                      style={{
                        background: '#F8F8FC',
                        border: '1px solid #E8E8F0',
                        color: '#1A1A2E',
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '1px solid #6C47FF'
                        e.target.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.08)'
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid #E8E8F0'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: '#6B6B8A' }}>
                      Color
                    </label>
                    <div className="flex gap-2.5 flex-wrap">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, color }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: color,
                            transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: form.color === color
                              ? `0 0 0 2px white, 0 0 0 4px ${color}`
                              : 'none',
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2"
                    style={{ borderTop: '1px solid #F0F0F8' }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: '#F8F8FC',
                        color: '#6B6B8A',
                        border: '1px solid #E8E8F0',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.name.trim() || createProject.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)',
                        boxShadow: '0 2px 8px rgba(108,71,255,0.3)',
                      }}
                    >
                      {createProject.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Creating…
                        </>
                      ) : (
                        'Create project'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
