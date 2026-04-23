import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProjects, useCreateProject, projectKeys } from "../useProjects";
import type { Project } from "@/types";

// ─── Mock the API client ────────────────────────────────────────
vi.mock("@/lib/api/client", () => ({
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

const mockProjects: Project[] = [
  {
    id: "proj-1",
    orgId: "org-1",
    name: "VYNE Platform",
    identifier: "VYNE",
    description: "The main platform",
    color: "#06B6D4",
    memberIds: ["user-1"],
    issueCounts: {
      backlog: 5,
      todo: 3,
      inProgress: 2,
      inReview: 1,
      done: 10,
      total: 21,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "proj-2",
    orgId: "org-1",
    name: "Mobile App",
    identifier: "MOB",
    description: "Mobile application",
    color: "#3B82F6",
    memberIds: ["user-1", "user-2"],
    issueCounts: {
      backlog: 2,
      todo: 1,
      inProgress: 0,
      inReview: 0,
      done: 5,
      total: 8,
    },
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
];

describe("useProjects", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  // ─── Fetching projects ──────────────────────────────────────────
  describe("fetching projects", () => {
    it("should return project data on success", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.list).mockResolvedValueOnce({
        data: { data: mockProjects },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].name).toBe("VYNE Platform");
    });

    it("should handle API returning data directly (no nested data wrapper)", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.list).mockResolvedValueOnce({
        data: { data: mockProjects },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
    });

    it("should handle error state", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.list).mockRejectedValueOnce(
        new Error("Network Error"),
      );

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error!.message).toBe("Network Error");
      expect(result.current.data).toBeUndefined();
    });

    it("should return empty array when API returns no projects", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.list).mockResolvedValueOnce({
        data: { data: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  // ─── Creating a project ─────────────────────────────────────────
  describe("creating a project", () => {
    it("should create a project and update the cache", async () => {
      const { projectsApi } = await import("@/lib/api/client");

      const newProject: Project = {
        id: "proj-3",
        orgId: "org-1",
        name: "Design System",
        identifier: "DS",
        description: "Shared design system",
        color: "#22C55E",
        memberIds: ["user-1"],
        issueCounts: {
          backlog: 0,
          todo: 0,
          inProgress: 0,
          inReview: 0,
          done: 0,
          total: 0,
        },
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z",
      };

      vi.mocked(projectsApi.create).mockResolvedValueOnce({
        data: newProject,
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as never,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        name: "Design System",
        identifier: "DS",
        description: "Shared design system",
        color: "#22C55E",
      });

      expect(projectsApi.create).toHaveBeenCalledWith({
        name: "Design System",
        identifier: "DS",
        description: "Shared design system",
        color: "#22C55E",
      });

      // Verify the detail cache was seeded
      const cachedDetail = queryClient.getQueryData(
        projectKeys.detail("proj-3"),
      );
      expect(cachedDetail).toEqual(newProject);
    });

    it("should handle creation errors", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.create).mockRejectedValueOnce(
        new Error("Identifier already taken"),
      );

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({
          name: "VYNE Platform",
          identifier: "VYNE",
          color: "#06B6D4",
        }),
      ).rejects.toThrow("Identifier already taken");

      expect(result.current.isError).toBe(true);
    });
  });

  // ─── Query Keys ─────────────────────────────────────────────────
  describe("projectKeys", () => {
    it("should produce correct query keys", () => {
      expect(projectKeys.all).toEqual(["projects"]);
      expect(projectKeys.lists()).toEqual(["projects", "list"]);
      expect(projectKeys.list()).toEqual(["projects", "list"]);
      expect(projectKeys.details()).toEqual(["projects", "detail"]);
      expect(projectKeys.detail("proj-1")).toEqual([
        "projects",
        "detail",
        "proj-1",
      ]);
    });
  });
});
