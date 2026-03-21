'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { codeApi } from '@/lib/api/client'
import type {
  Deployment,
  DeploymentStats,
  PullRequest,
  PullRequestStats,
  Repository,
} from '@/types'

// ─── Query Keys ──────────────────────────────────────────────────
export const codeKeys = {
  all: ['code'] as const,
  deployments: () => [...codeKeys.all, 'deployments'] as const,
  deployment: (id: string) => [...codeKeys.deployments(), id] as const,
  deploymentStats: () => [...codeKeys.deployments(), 'stats'] as const,
  pullRequests: () => [...codeKeys.all, 'pull-requests'] as const,
  pullRequestStats: () => [...codeKeys.pullRequests(), 'stats'] as const,
  repositories: () => [...codeKeys.all, 'repositories'] as const,
}

// ─── useDeployments ───────────────────────────────────────────────
export function useDeployments(params?: {
  service?: string
  environment?: string
  status?: string
  limit?: number
}): UseQueryResult<Deployment[], Error> {
  return useQuery({
    queryKey: [...codeKeys.deployments(), params],
    queryFn: async () => {
      const response = await codeApi.listDeployments(params)
      return response.data
    },
    staleTime: 30_000,
  })
}

// ─── useDeployment ────────────────────────────────────────────────
export function useDeployment(id: string): UseQueryResult<Deployment, Error> {
  return useQuery({
    queryKey: codeKeys.deployment(id),
    queryFn: async () => {
      const response = await codeApi.getDeployment(id)
      return response.data
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ─── useDeploymentStats ───────────────────────────────────────────
export function useDeploymentStats(): UseQueryResult<DeploymentStats, Error> {
  return useQuery({
    queryKey: codeKeys.deploymentStats(),
    queryFn: async () => {
      const response = await codeApi.getDeploymentStats()
      return response.data
    },
    staleTime: 60_000,
  })
}

// ─── useCreateDeployment ──────────────────────────────────────────
type CreateDeploymentInput = {
  serviceName: string
  version?: string
  environment?: string
  branch?: string
  commitSha?: string
  commitMessage?: string
  triggeredBy?: string
}

export function useCreateDeployment(): UseMutationResult<Deployment, Error, CreateDeploymentInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDeploymentInput) => {
      const response = await codeApi.createDeployment(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.deployments() })
      queryClient.invalidateQueries({ queryKey: codeKeys.deploymentStats() })
    },
  })
}

// ─── usePullRequests ──────────────────────────────────────────────
export function usePullRequests(params?: {
  repo?: string
  state?: string
  limit?: number
}): UseQueryResult<PullRequest[], Error> {
  return useQuery({
    queryKey: [...codeKeys.pullRequests(), params],
    queryFn: async () => {
      const response = await codeApi.listPullRequests(params)
      return response.data
    },
    staleTime: 30_000,
  })
}

// ─── usePullRequestStats ──────────────────────────────────────────
export function usePullRequestStats(): UseQueryResult<PullRequestStats, Error> {
  return useQuery({
    queryKey: codeKeys.pullRequestStats(),
    queryFn: async () => {
      const response = await codeApi.getPullRequestStats()
      return response.data
    },
    staleTime: 60_000,
  })
}

// ─── useRepositories ──────────────────────────────────────────────
export function useRepositories(): UseQueryResult<Repository[], Error> {
  return useQuery({
    queryKey: codeKeys.repositories(),
    queryFn: async () => {
      const response = await codeApi.listRepositories()
      return response.data
    },
    staleTime: 60_000,
  })
}

// ─── useConnectRepository ─────────────────────────────────────────
type ConnectRepoInput = {
  repoName: string
  githubUrl?: string
  defaultBranch?: string
}

export function useConnectRepository(): UseMutationResult<Repository, Error, ConnectRepoInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConnectRepoInput) => {
      const response = await codeApi.connectRepository(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.repositories() })
    },
  })
}
