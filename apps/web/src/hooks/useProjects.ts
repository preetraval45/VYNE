"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/client";
import type { Project } from "@/types";

// ─── Demo data (shown when backend is unavailable) ───────────────
const DEMO_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Vyne Platform",
    identifier: "VYNE",
    description: "Core platform development",
    color: "#06B6D4",
    icon: "🚀",
    status: "active",
    leadId: "1",
    issueCount: 42,
    memberCount: 8,
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "2",
    name: "Mobile App",
    identifier: "MOB",
    description: "React Native mobile application",
    color: "#22C55E",
    icon: "📱",
    status: "active",
    leadId: "2",
    issueCount: 18,
    memberCount: 3,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "3",
    name: "AI Engine",
    identifier: "AI",
    description: "LangGraph agents and ML models",
    color: "#F59E0B",
    icon: "🧠",
    status: "active",
    leadId: "1",
    issueCount: 24,
    memberCount: 4,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "4",
    name: "Infrastructure",
    identifier: "INFRA",
    description: "Terraform, CI/CD, and AWS",
    color: "#3B82F6",
    icon: "☁️",
    status: "active",
    leadId: "3",
    issueCount: 11,
    memberCount: 2,
    createdAt: "2026-01-20T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
  },
];

// ─── Query Keys ──────────────────────────────────────────────────
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ─── useProjects ─────────────────────────────────────────────────
export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      try {
        const response = await projectsApi.list();
        return response.data.data ?? response.data;
      } catch {
        // Fall back to demo data when API is unavailable
        return DEMO_PROJECTS;
      }
    },
    staleTime: 30_000,
  });
}

// ─── useProject ──────────────────────────────────────────────────
export function useProject(id: string): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const response = await projectsApi.get(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── useCreateProject ────────────────────────────────────────────
type CreateProjectInput = {
  name: string;
  identifier: string;
  description?: string;
  color: string;
  icon?: string;
};

export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  CreateProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await projectsApi.create(data);
      return response.data;
    },
    onSuccess: (newProject) => {
      // Optimistically add to list
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [newProject];
        return [newProject, ...old];
      });
      // Seed detail cache
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ─── useUpdateProject ────────────────────────────────────────────
type UpdateProjectInput = {
  id: string;
  data: Partial<
    Pick<Project, "name" | "description" | "color" | "icon" | "leadId">
  >;
};

export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  UpdateProjectInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateProjectInput) => {
      const response = await projectsApi.update(id, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) });
      const previousProject = queryClient.getQueryData<Project>(
        projectKeys.detail(id),
      );
      queryClient.setQueryData<Project>(projectKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old,
      );
      return { previousProject };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          projectKeys.detail(id),
          context.previousProject,
        );
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
