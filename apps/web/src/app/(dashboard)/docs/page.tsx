"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FileText, Clock, Search, X } from "lucide-react";
import {
  useDocs,
  useDoc,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useDocSearch,
} from "@/hooks/useDocs";
import { useDebounce } from "@/hooks/useDebounce";
import { DocTree } from "@/components/docs/DocTree";
import { formatDistanceToNow } from "date-fns";

// Lazy-load the Tiptap + lowlight + yjs stack (≈600KB) so the rest of
// the dashboard doesn't pay for it. Editor only mounts once a doc is
// selected, which is exactly when users want to wait for it.
const DocEditor = dynamic(
  () => import("@/components/docs/DocEditor").then((m) => m.DocEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        Loading editor…
      </div>
    ),
  },
);

// ── Recent Docs Grid ──────────────────────────────────────────────
function RecentDocsGrid({
  docs,
  onSelect,
}: {
  docs: {
    id: string;
    title: string;
    icon?: string | null;
    updatedAt: string;
  }[];
  onSelect: (id: string) => void;
}) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EDFF] flex items-center justify-center">
          <FileText size={24} style={{ color: "var(--vyne-purple)" }} />
        </div>
        <p className="text-[15px] font-semibold text-[#1A1A2E]">
          No documents yet
        </p>
        <p className="text-[13px] text-[#A0A0B8]">
          Create your first page from the sidebar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {docs.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className="group flex flex-col gap-2 p-4 rounded-xl border border-[#E8E8F0] bg-white hover:border-[#6C47FF] hover:shadow-vyne-sm transition-all text-left"
        >
          <span className="text-2xl leading-none">{doc.icon ?? "📄"}</span>
          <span className="text-[13px] font-medium text-[#1A1A2E] line-clamp-2 group-hover:text-[#6C47FF] transition-colors">
            {doc.title}
          </span>
          <span className="text-[11px] text-[#A0A0B8] mt-auto">
            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Search Results ────────────────────────────────────────────────
function SearchResults({
  query,
  onSelect,
  onClear,
}: {
  query: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const { data: results, isLoading } = useDocSearch(query);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1A1A2E]">
          Search results for &ldquo;{query}&rdquo;
        </h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[12px] text-[#A0A0B8] hover:text-[#6C47FF] transition-colors"
        >
          <X size={13} />
          Clear
        </button>
      </div>

      {isLoading && <p className="text-[13px] text-[#A0A0B8]">Searching…</p>}

      {!isLoading && results?.length === 0 && (
        <p className="text-[13px] text-[#A0A0B8]">No documents found.</p>
      )}

      <div className="flex flex-col gap-1">
        {results?.map((doc) => (
          <button
            key={doc.id}
            onClick={() => {
              onSelect(doc.id);
              onClear();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#E8E8F0] bg-white hover:border-[#6C47FF] hover:shadow-vyne-sm transition-all text-left"
          >
            <span className="text-lg">{doc.icon ?? "📄"}</span>
            <div>
              <p className="text-[13px] font-medium text-[#1A1A2E]">
                {doc.title}
              </p>
              <p className="text-[11px] text-[#A0A0B8]">
                Updated{" "}
                {formatDistanceToNow(new Date(doc.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Active Doc Loader ─────────────────────────────────────────────
function ActiveDocPanel({ id }: { id: string }) {
  const { data: doc, isLoading } = useDoc(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[13px] text-[#A0A0B8]">Document not found.</p>
      </div>
    );
  }

  return <DocEditor doc={doc} />;
}

// ── Main Docs Page ────────────────────────────────────────────────
export default function DocsPage() {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput.trim(), 300);

  const { data: allDocs = [], isLoading } = useDocs();
  const createDoc = useCreateDoc();
  const updateDoc = useUpdateDoc();
  const deleteDoc = useDeleteDoc();

  // Root-level docs
  const rootDocs = allDocs.filter((d) => !d.parentId);

  // Recent docs (last 20 sorted by updatedAt)
  const recentDocs = [...allDocs]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 20);

  async function handleCreateRoot() {
    const doc = await createDoc.mutateAsync({ title: "Untitled" });
    setActiveDocId(doc.id);
  }

  async function handleCreateChild(parentId: string) {
    const doc = await createDoc.mutateAsync({ parentId, title: "Untitled" });
    setActiveDocId(doc.id);
  }

  function handleRename(id: string, title: string) {
    updateDoc.mutate({ id, data: { title } });
  }

  function handleDelete(id: string) {
    deleteDoc.mutate(id);
    if (activeDocId === id) setActiveDocId(null);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  const isShowingSearch = searchQuery.length >= 2;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--content-bg)" }}
    >
      {/* ── Sidebar / Doc Tree ───────────────────────────────── */}
      <aside
        className="flex flex-col border-r border-[#E8E8F0] flex-shrink-0 overflow-hidden"
        style={{ width: 220, background: "var(--content-secondary)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-[#E8E8F0]">
          <FileText size={15} style={{ color: "var(--vyne-purple)" }} />
          <span className="text-[13px] font-semibold text-[#1A1A2E]">Docs</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="px-2 pt-2 pb-1">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-[#A0A0B8]" />
            <input
              className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-white border border-[#E8E8F0] rounded-md outline-none focus:border-[#6C47FF] transition-colors"
              placeholder="Search docs…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </form>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DocTree
              docs={rootDocs}
              allDocs={allDocs}
              activeDocId={activeDocId ?? undefined}
              onSelect={setActiveDocId}
              onCreateChild={handleCreateChild}
              onRename={handleRename}
              onDelete={handleDelete}
              onCreateRoot={handleCreateRoot}
            />
          )}
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeDocId && !isShowingSearch ? (
          <ActiveDocPanel id={activeDocId} />
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="max-w-[860px] mx-auto px-8 py-10">
              {isShowingSearch ? (
                <SearchResults
                  query={searchQuery}
                  onSelect={setActiveDocId}
                  onClear={() => {
                    setSearchInput("");
                  }}
                />
              ) : (
                <>
                  {/* Welcome header */}
                  <div className="mb-8">
                    <h1 className="text-[1.75rem] font-bold text-[#1A1A2E] mb-1">
                      Docs
                    </h1>
                    <p className="text-[14px] text-[#A0A0B8]">
                      Your team&rsquo;s knowledge base — all in one place.
                    </p>
                  </div>

                  {/* Recent docs */}
                  <div className="mb-2 flex items-center gap-2">
                    <Clock size={13} className="text-[#A0A0B8]" />
                    <span className="text-[12px] font-medium text-[#A0A0B8] uppercase tracking-wide">
                      Recent
                    </span>
                  </div>
                  <RecentDocsGrid docs={recentDocs} onSelect={setActiveDocId} />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
