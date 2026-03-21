'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { docsApi } from '@/lib/api/client'
import type { Document } from '@/types'

// ─── Query Keys ──────────────────────────────────────────────────
export const docKeys = {
  all: ['docs'] as const,
  lists: () => [...docKeys.all, 'list'] as const,
  list: () => [...docKeys.lists()] as const,
  children: (id: string) => [...docKeys.all, 'children', id] as const,
  details: () => [...docKeys.all, 'detail'] as const,
  detail: (id: string) => [...docKeys.details(), id] as const,
  search: (q: string) => [...docKeys.all, 'search', q] as const,
}

// ─── useDocs — root documents ─────────────────────────────────────
export function useDocs(): UseQueryResult<Document[], Error> {
  return useQuery({
    queryKey: docKeys.list(),
    queryFn: async () => {
      const response = await docsApi.list()
      return response.data
    },
    staleTime: 30_000,
  })
}

// ─── useDoc — single document with content ────────────────────────
export function useDoc(id: string): UseQueryResult<Document, Error> {
  return useQuery({
    queryKey: docKeys.detail(id),
    queryFn: async () => {
      const response = await docsApi.get(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 15_000,
  })
}

// ─── useDocChildren ───────────────────────────────────────────────
export function useDocChildren(id: string): UseQueryResult<Document[], Error> {
  return useQuery({
    queryKey: docKeys.children(id),
    queryFn: async () => {
      const response = await docsApi.getChildren(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ─── useCreateDoc ─────────────────────────────────────────────────
type CreateDocInput = {
  title?: string
  parentId?: string
  icon?: string
  content?: string
}

export function useCreateDoc(): UseMutationResult<Document, Error, CreateDocInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDocInput) => {
      const response = await docsApi.create(data)
      return response.data
    },
    onSuccess: (newDoc) => {
      // Seed detail cache
      queryClient.setQueryData(docKeys.detail(newDoc.id), newDoc)

      if (newDoc.parentId) {
        // Invalidate children of parent
        queryClient.invalidateQueries({ queryKey: docKeys.children(newDoc.parentId) })
      } else {
        // Invalidate root list
        queryClient.invalidateQueries({ queryKey: docKeys.lists() })
      }
    },
  })
}

// ─── useUpdateDoc ─────────────────────────────────────────────────
type UpdateDocInput = {
  id: string
  data: { title?: string; icon?: string; coverUrl?: string; content?: string }
}

export function useUpdateDoc(): UseMutationResult<Document, Error, UpdateDocInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: UpdateDocInput) => {
      const response = await docsApi.update(id, data)
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: docKeys.detail(id) })
      const previous = queryClient.getQueryData<Document>(docKeys.detail(id))
      queryClient.setQueryData<Document>(docKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old
      )
      return { previous }
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(docKeys.detail(id), context.previous)
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: docKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: docKeys.lists() })
    },
  })
}

// ─── useDeleteDoc ─────────────────────────────────────────────────
export function useDeleteDoc(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await docsApi.delete(id)
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: docKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: docKeys.lists() })
      // Also invalidate all children caches since tree changes
      queryClient.invalidateQueries({ queryKey: docKeys.all })
    },
  })
}

// ─── useDocSearch ─────────────────────────────────────────────────
export function useDocSearch(q: string): UseQueryResult<Document[], Error> {
  return useQuery({
    queryKey: docKeys.search(q),
    queryFn: async () => {
      const response = await docsApi.search(q)
      return response.data
    },
    enabled: q.length >= 2,
    staleTime: 10_000,
  })
}
