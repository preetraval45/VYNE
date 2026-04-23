"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useQuery,
  useInfiniteQuery,
  type UseQueryResult,
  type UseInfiniteQueryResult,
  type QueryKey,
  type QueryFunction,
} from "@tanstack/react-query";
import type { PaginatedResponse, CursorPaginatedResponse } from "@/types";

// ─── Types ──────────────────────────────────────────────────────

type PaginationType = "offset" | "cursor";

interface UsePaginationBaseOptions<T> {
  /** React Query cache key */
  readonly queryKey: QueryKey;
  /** Default number of items per page */
  readonly pageSize?: number;
  /** Pagination strategy */
  readonly type: PaginationType;
  /** React Query staleTime override (ms) */
  readonly staleTime?: number;
  /** Whether the query should execute */
  readonly enabled?: boolean;
}

// ─── Offset Pagination ──────────────────────────────────────────

interface UseOffsetPaginationOptions<T> extends UsePaginationBaseOptions<T> {
  readonly type: "offset";
  /** Fetcher that receives page (1-based) and pageSize, returns PaginatedResponse */
  readonly queryFn: (params: {
    page: number;
    pageSize: number;
  }) => Promise<PaginatedResponse<T>>;
}

interface UseOffsetPaginationResult<T> {
  /** Current page's data items */
  data: T[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a background refetch is in progress */
  isFetching: boolean;
  /** Whether the query has errored */
  isError: boolean;
  /** Error object, if any */
  error: Error | null;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
  /** Go to next page */
  fetchNextPage: () => void;
  /** Go to previous page */
  fetchPrevPage: () => void;
  /** Jump to a specific page (1-based) */
  goToPage: (page: number) => void;
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Current page size */
  pageSize: number;
  /** Change the page size (resets to page 1) */
  setPageSize: (size: number) => void;
  /** The underlying React Query result for advanced usage */
  query: UseQueryResult<PaginatedResponse<T>, Error>;
}

// ─── Cursor Pagination ──────────────────────────────────────────

interface UseCursorPaginationOptions<T> extends UsePaginationBaseOptions<T> {
  readonly type: "cursor";
  /** Fetcher that receives cursor and pageSize, returns CursorPaginatedResponse */
  readonly queryFn: (params: {
    cursor: string | null;
    pageSize: number;
    direction: "forward" | "backward";
  }) => Promise<CursorPaginatedResponse<T>>;
}

interface UseCursorPaginationResult<T> {
  /** All loaded data items (flattened across fetched pages) */
  data: T[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a page fetch is in progress */
  isFetching: boolean;
  /** Whether fetching the next page specifically */
  isFetchingNextPage: boolean;
  /** Whether the query has errored */
  isError: boolean;
  /** Error object, if any */
  error: Error | null;
  /** Whether more data exists after the last loaded page */
  hasNextPage: boolean;
  /** Fetch the next page of data (appends to existing) */
  fetchNextPage: () => void;
  /** Current page size */
  pageSize: number;
  /** Change the page size (resets loaded data) */
  setPageSize: (size: number) => void;
  /** The underlying React Query infinite query result for advanced usage */
  query: UseInfiniteQueryResult<CursorPaginatedResponse<T>, Error>;
}

// ─── Discriminated Union Return ─────────────────────────────────

type UsePaginationOptions<T> =
  | UseOffsetPaginationOptions<T>
  | UseCursorPaginationOptions<T>;

type UsePaginationResult<T> =
  | UseOffsetPaginationResult<T>
  | UseCursorPaginationResult<T>;

// ─── useOffsetPagination (internal) ─────────────────────────────

function useOffsetPagination<T>(
  options: UseOffsetPaginationOptions<T>,
): UseOffsetPaginationResult<T> {
  const {
    queryKey,
    queryFn,
    pageSize: initialPageSize = 25,
    staleTime = 30_000,
    enabled = true,
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const query = useQuery<PaginatedResponse<T>, Error>({
    queryKey: [...queryKey, { page, pageSize }],
    queryFn: () => queryFn({ page, pageSize }),
    staleTime,
    enabled,
    placeholderData: (previousData) => previousData,
  });

  const responseData = query.data;

  const totalCount = responseData?.total ?? 0;
  const totalPages =
    (responseData?.totalPages ?? Math.ceil(totalCount / pageSize)) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const fetchNextPage = useCallback(() => {
    if (hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [hasNextPage]);

  const fetchPrevPage = useCallback(() => {
    if (hasPrevPage) {
      setPage((p) => p - 1);
    }
  }, [hasPrevPage]);

  const goToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(targetPage, totalPages));
      setPage(clamped);
    },
    [totalPages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when page size changes
  }, []);

  return {
    data: responseData?.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasNextPage,
    hasPrevPage,
    fetchNextPage,
    fetchPrevPage,
    goToPage,
    page,
    totalPages,
    totalCount,
    pageSize,
    setPageSize,
    query,
  };
}

// ─── useCursorPagination (internal) ─────────────────────────────

function useCursorPagination<T>(
  options: UseCursorPaginationOptions<T>,
): UseCursorPaginationResult<T> {
  const {
    queryKey,
    queryFn,
    pageSize: initialPageSize = 25,
    staleTime = 30_000,
    enabled = true,
  } = options;

  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const query = useInfiniteQuery<CursorPaginatedResponse<T>, Error>({
    queryKey: [...queryKey, { pageSize }],
    queryFn: ({ pageParam }) =>
      queryFn({
        cursor: (pageParam as string) ?? null,
        pageSize,
        direction: "forward",
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime,
    enabled,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    // The queryKey change will trigger a refetch with fresh data
  }, []);

  return {
    data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage,
    pageSize,
    setPageSize,
    query: query as unknown as UseCursorPaginationResult<T>["query"],
  };
}

// ─── usePagination (public) ─────────────────────────────────────

/**
 * Generic pagination hook that wraps React Query.
 *
 * Supports two pagination strategies:
 * - `offset`: Traditional page-number navigation (tables, grids)
 * - `cursor`: Cursor-based infinite loading (feeds, activity logs, chat)
 *
 * @example Offset pagination
 * ```ts
 * const { data, page, totalPages, goToPage } = usePagination({
 *   type: 'offset',
 *   queryKey: ['issues', projectId],
 *   queryFn: ({ page, pageSize }) =>
 *     api.get(`/issues?page=${page}&pageSize=${pageSize}`),
 *   pageSize: 25,
 * })
 * ```
 *
 * @example Cursor pagination
 * ```ts
 * const { data, hasNextPage, fetchNextPage } = usePagination({
 *   type: 'cursor',
 *   queryKey: ['messages', channelId],
 *   queryFn: ({ cursor, pageSize }) =>
 *     api.get(`/messages?cursor=${cursor}&limit=${pageSize}`),
 *   pageSize: 50,
 * })
 * ```
 */
export function usePagination<T>(
  options: UseOffsetPaginationOptions<T>,
): UseOffsetPaginationResult<T>;
export function usePagination<T>(
  options: UseCursorPaginationOptions<T>,
): UseCursorPaginationResult<T>;
export function usePagination<T>(
  options: UsePaginationOptions<T>,
): UsePaginationResult<T> {
  if (options.type === "cursor") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCursorPagination(options);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useOffsetPagination(options);
}

// ─── Re-export types for consumers ──────────────────────────────

export type {
  UseOffsetPaginationOptions,
  UseOffsetPaginationResult,
  UseCursorPaginationOptions,
  UseCursorPaginationResult,
  UsePaginationOptions,
  UsePaginationResult,
};
