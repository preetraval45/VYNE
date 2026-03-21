'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { issuesApi } from '@/lib/api/client'
import type { Issue, FilterState, IssueStatus, IssuePriority } from '@/types'

// ─── Query Keys ──────────────────────────────────────────────────
export const issueKeys = {
  all: ['issues'] as const,
  byProject: (projectId: string) => [...issueKeys.all, 'project', projectId] as const,
  byProjectFiltered: (projectId: string, filters?: FilterState) =>
    [...issueKeys.byProject(projectId), filters] as const,
  detail: (id: string) => [...issueKeys.all, 'detail', id] as const,
}

// ─── useIssues ───────────────────────────────────────────────────
export function useIssues(
  projectId: string,
  filters?: FilterState
): UseQueryResult<Issue[], Error> {
  return useQuery({
    queryKey: issueKeys.byProjectFiltered(projectId, filters),
    queryFn: async () => {
      const response = await issuesApi.list(projectId, filters)
      return response.data.data ?? response.data
    },
    enabled: !!projectId,
    staleTime: 20_000,
  })
}

// ─── useIssue ────────────────────────────────────────────────────
export function useIssue(id: string): UseQueryResult<Issue, Error> {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: async () => {
      const response = await issuesApi.get(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 15_000,
  })
}

// ─── useCreateIssue ──────────────────────────────────────────────
type CreateIssueInput = {
  projectId: string
  title: string
  description?: string
  status: IssueStatus
  priority: IssuePriority
  assigneeId?: string
  dueDate?: string
}

export function useCreateIssue(): UseMutationResult<Issue, Error, CreateIssueInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, ...data }: CreateIssueInput) => {
      const response = await issuesApi.create(projectId, data)
      return response.data
    },
    onMutate: async (newIssue) => {
      const queryKey = issueKeys.byProject(newIssue.projectId)
      await queryClient.cancelQueries({ queryKey })
      const previousIssues = queryClient.getQueryData<Issue[]>(queryKey)

      // Optimistic insert
      const optimisticIssue: Issue = {
        id: `temp-${Date.now()}`,
        projectId: newIssue.projectId,
        identifier: 'NEW',
        title: newIssue.title,
        description: newIssue.description,
        status: newIssue.status,
        priority: newIssue.priority,
        assigneeId: newIssue.assigneeId,
        reporterId: '',
        labels: [],
        dueDate: newIssue.dueDate,
        order: 9999,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Issue[]>(queryKey, (old) =>
        old ? [optimisticIssue, ...old] : [optimisticIssue]
      )

      return { previousIssues, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey && context?.previousIssues) {
        queryClient.setQueryData(context.queryKey, context.previousIssues)
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.byProject(vars.projectId) })
    },
  })
}

// ─── useUpdateIssue ──────────────────────────────────────────────
type UpdateIssueInput = {
  id: string
  projectId: string
  data: Partial<
    Pick<Issue, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate' | 'estimate'>
  >
}

export function useUpdateIssue(): UseMutationResult<Issue, Error, UpdateIssueInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: UpdateIssueInput) => {
      const response = await issuesApi.update(id, data)
      return response.data
    },
    onMutate: async ({ id, projectId, data }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: issueKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: issueKeys.byProject(projectId) })

      const previousIssue = queryClient.getQueryData<Issue>(issueKeys.detail(id))

      // Update detail
      queryClient.setQueryData<Issue>(issueKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old
      )

      // Update in list
      queryClient.setQueryData<Issue[]>(issueKeys.byProject(projectId), (old) =>
        old?.map((issue) => (issue.id === id ? { ...issue, ...data } : issue))
      )

      return { previousIssue }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(issueKeys.detail(id), context.previousIssue)
      }
    },
    onSettled: (_data, _err, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
    },
  })
}

// ─── useReorderIssues ────────────────────────────────────────────
type ReorderInput = {
  projectId: string
  updates: Array<{ id: string; status: IssueStatus; order: number }>
}

export function useReorderIssues(): UseMutationResult<void, Error, ReorderInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ updates }: ReorderInput) => {
      await issuesApi.reorder(updates)
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.byProject(projectId) })
    },
  })
}
