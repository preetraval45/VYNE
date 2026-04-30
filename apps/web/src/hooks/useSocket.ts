'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth'
import { issueKeys } from './useIssues'
import type { Issue } from '@/types'

// Resolve socket URL: explicit env var > same-origin in browser > localhost in dev.
function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    // In production, websocket back to the same origin (Vercel runs
    // both the app + API on the same hostname). On dev, fall back to
    // the local services port.
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    if (isDev) return 'http://localhost:4000'
    return window.location.origin
  }
  return 'http://localhost:4000'
}

const API_URL = resolveApiUrl()

let globalSocket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

function getBackoffDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30_000)
}

export function useSocket(projectId?: string) {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!token) return

    if (globalSocket?.connected) {
      socketRef.current = globalSocket
      return
    }

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
    })

    globalSocket = socket
    socketRef.current = socket

    socket.on('connect', () => {
      reconnectAttempts = 0
      console.log('[Socket] Connected:', socket.id)

      // Re-subscribe if we have an active project
      if (projectId) {
        socket.emit('subscribe:project', projectId)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      scheduleReconnect()
    })

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message)
      scheduleReconnect()
    })

    // ─── Issue Events ──────────────────────────────────────────
    socket.on('IssueUpdated', (updatedIssue: Issue) => {
      // Update detail cache
      queryClient.setQueryData<Issue>(
        issueKeys.detail(updatedIssue.id),
        (old) => (old ? { ...old, ...updatedIssue } : updatedIssue)
      )

      // Update in list cache
      queryClient.setQueryData<Issue[]>(
        issueKeys.byProject(updatedIssue.projectId),
        (old) =>
          old?.map((issue) =>
            issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
          )
      )
    })

    socket.on('IssueCreated', (newIssue: Issue) => {
      queryClient.setQueryData<Issue[]>(
        issueKeys.byProject(newIssue.projectId),
        (old) => {
          if (!old) return [newIssue]
          // Avoid duplicates
          const exists = old.some((i) => i.id === newIssue.id)
          if (exists) return old
          return [newIssue, ...old]
        }
      )
    })

    socket.on('IssueDeleted', ({ id, projectId: pid }: { id: string; projectId: string }) => {
      queryClient.setQueryData<Issue[]>(
        issueKeys.byProject(pid),
        (old) => old?.filter((issue) => issue.id !== id)
      )
      queryClient.removeQueries({ queryKey: issueKeys.detail(id) })
    })
  }, [token, projectId, queryClient])

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Socket] Max reconnect attempts reached')
      return
    }

    const delay = getBackoffDelay(reconnectAttempts)
    reconnectAttempts++
    console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)

    reconnectTimerRef.current = setTimeout(() => {
      connect()
    }, delay)
  }

  // Connect on mount / token change
  useEffect(() => {
    if (token) {
      connect()
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [token, connect])

  // Subscribe/unsubscribe to project room
  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected || !projectId) return

    socket.emit('subscribe:project', projectId)

    return () => {
      socket.emit('unsubscribe:project', projectId)
    }
  }, [projectId])

  const joinProject = useCallback((pid: string) => {
    socketRef.current?.emit('subscribe:project', pid)
  }, [])

  const leaveProject = useCallback((pid: string) => {
    socketRef.current?.emit('unsubscribe:project', pid)
  }, [])

  const isConnected = socketRef.current?.connected ?? false

  return {
    socket: socketRef.current,
    isConnected,
    joinProject,
    leaveProject,
  }
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}
