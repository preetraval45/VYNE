'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { projectsApi } from '@/lib/api/client'
import type { Project } from '@/types'

// ─── Query Keys ──────────────────────────────────────────────────
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// ─── useProjects ─────────────────────────────────────────────────
export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const response = await projectsApi.list()
      return response.data.data ?? response.data
    },
    staleTime: 30_000,
  })
}

// ─── useProject ──────────────────────────────────────────────────
export function useProject(id: string): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const response = await projectsApi.get(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ─── useCreateProject ────────────────────────────────────────────
type CreateProjectInput = {
  name: string
  identifier: string
  description?: string
  color: string
  icon?: string
}

export function useCreateProject(): UseMutationResult<Project, Error, CreateProjectInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await projectsApi.create(data)
      return response.data
    },
    onSuccess: (newProject) => {
      // Optimistically add to list
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [newProject]
        return [newProject, ...old]
      })
      // Seed detail cache
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// ─── useUpdateProject ────────────────────────────────────────────
type UpdateProjectInput = {
  id: string
  data: Partial<Pick<Project, 'name' | 'description' | 'color' | 'icon' | 'leadId'>>
}

export function useUpdateProject(): UseMutationResult<Project, Error, UpdateProjectInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: UpdateProjectInput) => {
      const response = await projectsApi.update(id, data)
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) })
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(id))
      queryClient.setQueryData<Project>(projectKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old
      )
      return { previousProject }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject)
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
