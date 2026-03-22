"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { issuesApi } from "@/lib/api/client";
import type { Issue, FilterState, IssueStatus, IssuePriority } from "@/types";

// ─── Query Keys ──────────────────────────────────────────────────
export const issueKeys = {
  all: ["issues"] as const,
  byProject: (projectId: string) =>
    [...issueKeys.all, "project", projectId] as const,
  byProjectFiltered: (projectId: string, filters?: FilterState) =>
    [...issueKeys.byProject(projectId), filters] as const,
  detail: (id: string) => [...issueKeys.all, "detail", id] as const,
};

// ─── Demo issues ────────────────────────────────────────────────
const DEMO_ISSUES: Issue[] = [
  {
    id: "1",
    key: "ENG-43",
    title: "Fix Secrets Manager IAM permissions",
    description: "Missing iam:GetSecretValue on ECS task role",
    status: "in_progress" as IssueStatus,
    priority: "urgent" as IssuePriority,
    projectId: "1",
    assigneeId: "1",
    assigneeName: "Preet R.",
    order: 0,
    createdAt: "2026-03-19T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "2",
    key: "ENG-45",
    title: "LangGraph agent orchestration review",
    description: "Review the multi-agent workflow",
    status: "in_review" as IssueStatus,
    priority: "high" as IssuePriority,
    projectId: "1",
    assigneeId: "2",
    assigneeName: "Sarah K.",
    order: 1,
    createdAt: "2026-03-18T00:00:00Z",
    updatedAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "3",
    key: "ENG-41",
    title: "TimescaleDB metrics schema migration",
    description: "Add hypertable for observability",
    status: "in_review" as IssueStatus,
    priority: "medium" as IssuePriority,
    projectId: "1",
    assigneeId: "3",
    assigneeName: "Tony M.",
    order: 2,
    createdAt: "2026-03-15T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
  },
  {
    id: "4",
    key: "ENG-50",
    title: "Chat file upload integration",
    description: "Wire up S3 presigned URLs",
    status: "todo" as IssueStatus,
    priority: "high" as IssuePriority,
    projectId: "1",
    order: 3,
    createdAt: "2026-03-21T00:00:00Z",
    updatedAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "5",
    key: "ENG-48",
    title: "Dark mode CSS variable cleanup",
    description: "Replace remaining hardcoded colors",
    status: "done" as IssueStatus,
    priority: "medium" as IssuePriority,
    projectId: "1",
    assigneeId: "1",
    assigneeName: "Preet R.",
    order: 4,
    createdAt: "2026-03-20T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "6",
    key: "PRD-12",
    title: "Roadmap page redesign",
    description: "Add timeline, kanban and list views",
    status: "done" as IssueStatus,
    priority: "high" as IssuePriority,
    projectId: "2",
    assigneeId: "2",
    assigneeName: "Sarah K.",
    order: 5,
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
];

// ─── useIssues ───────────────────────────────────────────────────
export function useIssues(
  projectId: string,
  filters?: FilterState,
): UseQueryResult<Issue[], Error> {
  return useQuery({
    queryKey: issueKeys.byProjectFiltered(projectId, filters),
    queryFn: async () => {
      try {
        const response = await issuesApi.list(projectId, filters);
        return response.data.data ?? response.data;
      } catch {
        return DEMO_ISSUES.filter((i) => i.projectId === projectId);
      }
    },
    enabled: !!projectId,
    staleTime: 20_000,
  });
}

// ─── useIssue ────────────────────────────────────────────────────
export function useIssue(id: string): UseQueryResult<Issue, Error> {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: async () => {
      const response = await issuesApi.get(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

// ─── useCreateIssue ──────────────────────────────────────────────
type CreateIssueInput = {
  projectId: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string;
  dueDate?: string;
};

export function useCreateIssue(): UseMutationResult<
  Issue,
  Error,
  CreateIssueInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...data }: CreateIssueInput) => {
      const response = await issuesApi.create(projectId, data);
      return response.data;
    },
    onMutate: async (newIssue) => {
      const queryKey = issueKeys.byProject(newIssue.projectId);
      await queryClient.cancelQueries({ queryKey });
      const previousIssues = queryClient.getQueryData<Issue[]>(queryKey);

      // Optimistic insert
      const optimisticIssue: Issue = {
        id: `temp-${Date.now()}`,
        projectId: newIssue.projectId,
        identifier: "NEW",
        title: newIssue.title,
        description: newIssue.description,
        status: newIssue.status,
        priority: newIssue.priority,
        assigneeId: newIssue.assigneeId,
        reporterId: "",
        labels: [],
        dueDate: newIssue.dueDate,
        order: 9999,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Issue[]>(queryKey, (old) =>
        old ? [optimisticIssue, ...old] : [optimisticIssue],
      );

      return { previousIssues, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey && context?.previousIssues) {
        queryClient.setQueryData(context.queryKey, context.previousIssues);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: issueKeys.byProject(vars.projectId),
      });
    },
  });
}

// ─── useUpdateIssue ──────────────────────────────────────────────
type UpdateIssueInput = {
  id: string;
  projectId: string;
  data: Partial<
    Pick<
      Issue,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "assigneeId"
      | "dueDate"
      | "estimate"
    >
  >;
};

export function useUpdateIssue(): UseMutationResult<
  Issue,
  Error,
  UpdateIssueInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateIssueInput) => {
      const response = await issuesApi.update(id, data);
      return response.data;
    },
    onMutate: async ({ id, projectId, data }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: issueKeys.detail(id) });
      await queryClient.cancelQueries({
        queryKey: issueKeys.byProject(projectId),
      });

      const previousIssue = queryClient.getQueryData<Issue>(
        issueKeys.detail(id),
      );

      // Update detail
      queryClient.setQueryData<Issue>(issueKeys.detail(id), (old) =>
        old ? { ...old, ...data } : old,
      );

      // Update in list
      queryClient.setQueryData<Issue[]>(issueKeys.byProject(projectId), (old) =>
        old?.map((issue) => (issue.id === id ? { ...issue, ...data } : issue)),
      );

      return { previousIssue };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousIssue) {
        queryClient.setQueryData(issueKeys.detail(id), context.previousIssue);
      }
    },
    onSettled: (_data, _err, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(id) });
      queryClient.invalidateQueries({
        queryKey: issueKeys.byProject(projectId),
      });
    },
  });
}

// ─── useReorderIssues ────────────────────────────────────────────
type ReorderInput = {
  projectId: string;
  updates: Array<{ id: string; status: IssueStatus; order: number }>;
};

export function useReorderIssues(): UseMutationResult<
  void,
  Error,
  ReorderInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates }: ReorderInput) => {
      await issuesApi.reorder(updates);
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: issueKeys.byProject(projectId),
      });
    },
  });
}
