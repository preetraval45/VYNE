"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useDocsStore } from "@/lib/stores/docs";
import type { Document } from "@/types";

/* ───────────────────────────────────────────────────────────────
 * Backed by a local Zustand store (see lib/stores/docs.ts) so that
 * "Add page" and friends actually persist on the static-frontend
 * Vercel deployment, where the previous HTTP-backed docsApi was
 * pointing at a backend that doesn't exist.
 *
 * The mutation hooks keep the @tanstack/react-query MutationResult
 * shape so the page-level call sites (mutate / mutateAsync / status
 * flags) keep working unchanged.
 * ─────────────────────────────────────────────────────────────── */

// ─── Query Keys (kept for back-compat with any existing consumers) ──
export const docKeys = {
  all: ["docs"] as const,
  lists: () => [...docKeys.all, "list"] as const,
  list: () => [...docKeys.lists()] as const,
  children: (id: string) => [...docKeys.all, "children", id] as const,
  details: () => [...docKeys.all, "detail"] as const,
  detail: (id: string) => [...docKeys.details(), id] as const,
  search: (q: string) => [...docKeys.all, "search", q] as const,
};

interface QueryShape<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: false;
  error: null;
  refetch: () => void;
}

function ok<T>(data: T): QueryShape<T> {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}

// ─── useDocs — all documents ──────────────────────────────────────
export function useDocs(): QueryShape<Document[]> {
  const docs = useDocsStore((s) => s.docs);
  return ok(docs);
}

// ─── useDoc — single document ─────────────────────────────────────
export function useDoc(id: string): QueryShape<Document | undefined> {
  const docs = useDocsStore((s) => s.docs);
  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id]);
  return ok(doc);
}

// ─── useDocChildren ───────────────────────────────────────────────
export function useDocChildren(id: string): QueryShape<Document[]> {
  const docs = useDocsStore((s) => s.docs);
  const children = useMemo(
    () => docs.filter((d) => d.parentId === id),
    [docs, id],
  );
  return ok(children);
}

// ─── useCreateDoc ─────────────────────────────────────────────────
type CreateDocInput = {
  title?: string;
  parentId?: string;
  icon?: string;
  content?: string;
};

export function useCreateDoc(): UseMutationResult<
  Document,
  Error,
  CreateDocInput
> {
  const queryClient = useQueryClient();
  const add = useDocsStore((s) => s.add);

  return useMutation({
    mutationFn: async (data: CreateDocInput) => {
      // Tiny artificial delay so any spinner UI flashes naturally.
      await new Promise((r) => setTimeout(r, 50));
      return add({
        title: data.title,
        parentId: data.parentId ?? null,
        icon: data.icon,
        content: data.content,
      });
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(docKeys.detail(newDoc.id), newDoc);
      queryClient.invalidateQueries({ queryKey: docKeys.all });
    },
  });
}

// ─── useUpdateDoc ─────────────────────────────────────────────────
type UpdateDocInput = {
  id: string;
  data: { title?: string; icon?: string; coverUrl?: string; content?: string };
};

export function useUpdateDoc(): UseMutationResult<
  Document,
  Error,
  UpdateDocInput
> {
  const queryClient = useQueryClient();
  const update = useDocsStore((s) => s.update);
  const docs = useDocsStore((s) => s.docs);

  return useMutation({
    mutationFn: async ({ id, data }: UpdateDocInput) => {
      update(id, data);
      const next = docs.find((d) => d.id === id);
      if (!next) throw new Error("Document not found");
      return { ...next, ...data, updatedAt: new Date().toISOString() };
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: docKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: docKeys.lists() });
    },
  });
}

// ─── useDeleteDoc ─────────────────────────────────────────────────
export function useDeleteDoc(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const remove = useDocsStore((s) => s.remove);

  return useMutation({
    mutationFn: async (id: string) => {
      remove(id);
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: docKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: docKeys.all });
    },
  });
}

// ─── useDocSearch ─────────────────────────────────────────────────
export function useDocSearch(q: string): QueryShape<Document[]> {
  const docs = useDocsStore((s) => s.docs);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(needle) ||
        (d.content ?? "").toLowerCase().includes(needle),
    );
  }, [docs, q]);
  return ok(matches);
}
