// PH-F R3 — re-aligned. The hook now wraps projectsApi.list in a try/catch
// that falls back to DEMO_PROJECTS, so the previous "should handle error
// state" assertion would never fire isError. We test the new behaviour:
//   • happy path returns the API payload
//   • on API failure the hook resolves with the demo fixture (no isError)
//   • create + cache-seed still work
//   • projectKeys produce stable structures

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProjects, useCreateProject, projectKeys } from "../useProjects";
import type { Project } from "@/types";

vi.mock("@/lib/api/client", () => ({
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

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
    name: "VYNE Platform",
    identifier: "VYNE",
    color: "#06B6D4",
    status: "active",
    issueCount: 21,
    memberCount: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "proj-2",
    name: "Mobile App",
    identifier: "MOB",
    color: "#3B82F6",
    status: "active",
    issueCount: 8,
    memberCount: 2,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

describe("useProjects", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  describe("fetching projects", () => {
    it("returns project data on success", async () => {
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

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProjects);
    });

    it("falls back to the demo fixture when the API throws", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      vi.mocked(projectsApi.list).mockRejectedValueOnce(new Error("offline"));

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(queryClient),
      });

      // The catch-block in the queryFn returns DEMO_PROJECTS, which means
      // the query resolves as a success — NOT an error.
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isError).toBe(false);
      expect(Array.isArray(result.current.data)).toBe(true);
      // DEMO_PROJECTS includes "Vyne Platform" and "Mobile App" entries.
      const names = (result.current.data ?? []).map((p) => p.name);
      expect(names).toContain("Vyne Platform");
    });

    it("handles an empty list payload", async () => {
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

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe("creating a project", () => {
    it("seeds the detail + list caches on success", async () => {
      const { projectsApi } = await import("@/lib/api/client");
      const newProject: Project = {
        id: "proj-3",
        name: "Design System",
        identifier: "DS",
        color: "#22C55E",
        status: "active",
        createdAt: "2026-03-20T00:00:00.000Z",
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
        color: "#22C55E",
      });

      expect(projectsApi.create).toHaveBeenCalledWith({
        name: "Design System",
        identifier: "DS",
        color: "#22C55E",
      });
      expect(queryClient.getQueryData(projectKeys.detail("proj-3"))).toEqual(
        newProject,
      );
    });

    it("propagates creation errors", async () => {
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
    });
  });

  describe("projectKeys", () => {
    it("produces stable query keys", () => {
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
