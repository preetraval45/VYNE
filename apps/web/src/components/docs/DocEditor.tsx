"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Code2,
  History,
  Image as ImageIcon,
  X,
  Sparkles,
  PencilRuler,
  MessageCircle,
  GitCompare,
} from "lucide-react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useUpdateDoc } from "@/hooks/useDocs";
import { useAuthStore } from "@/lib/stores/auth";
import type { Document } from "@/types";
import { useCollab } from "./useCollab";
import { CollabPresence } from "./CollabPresence";
import { DiffViewer } from "./DiffViewer";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { CommentsPanel } from "@/components/shared/CommentsPanel";
import { ReactionsBar } from "@/components/shared/ReactionsBar";
import { PresenceIndicator } from "@/components/shared/PresenceIndicator";

const lowlight = createLowlight(common);

// ── Version history helpers ───────────────────────────────────────
const MAX_VERSIONS = 20;

interface DocVersion {
  id: string;
  title: string;
  content: string;
  savedAt: string; // ISO string
}

function versionsKey(docId: string) {
  return `vyne-doc-versions-${docId}`;
}

function loadVersions(docId: string): DocVersion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(versionsKey(docId)) ?? "[]",
    ) as DocVersion[];
  } catch {
    return [];
  }
}

function saveVersion(docId: string, title: string, content: string) {
  const existing = loadVersions(docId);
  const latest = existing[0];
  // Deduplicate: skip if content unchanged since last snapshot
  if (latest && latest.content === content && latest.title === title) return;
  const entry: DocVersion = {
    id: Date.now().toString(36),
    title: title || "Untitled",
    content,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...existing].slice(0, MAX_VERSIONS);
  localStorage.setItem(versionsKey(docId), JSON.stringify(next));
}

// ── Version History Panel ─────────────────────────────────────────
function VersionHistoryPanel({
  versions,
  onRestore,
  onCompare,
  onClose,
}: {
  versions: DocVersion[];
  onRestore: (v: DocVersion) => void;
  onCompare: (v: DocVersion) => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<DocVersion | null>(null);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 300,
        height: "100%",
        background: "var(--content-bg)",
        borderLeft: "1px solid var(--content-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Version History
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close version history"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 2,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Version list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {versions.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No versions saved yet.
            <br />
            Versions are created automatically as you edit.
          </div>
        ) : (
          versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setPreview(v)}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "10px 16px",
                borderBottom: "1px solid var(--content-bg-secondary)",
                background:
                  preview?.id === v.id
                    ? "rgba(6, 182, 212,0.04)"
                    : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderLeft:
                  preview?.id === v.id
                    ? "3px solid #06B6D4"
                    : "3px solid transparent",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {v.title}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {new Date(v.savedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Restore + Compare */}
      {preview && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--content-border)",
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => onCompare(preview)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => {
              onRestore(preview);
              onClose();
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Restore
          </button>
        </div>
      )}
    </div>
  );
}

// ── Slash command menu items ──────────────────────────────────────
const SLASH_ITEMS = [
  {
    title: "Heading 1",
    icon: "H1",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: "H2",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: "H3",
    command: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    icon: "•",
    command: (editor: Editor) =>
      editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    icon: "1.",
    command: (editor: Editor) =>
      editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    icon: "❝",
    command: (editor: Editor) =>
      editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    icon: "</>",
    command: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    icon: "—",
    command: (editor: Editor) =>
      editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Table",
    icon: "▦",
    command: (editor: Editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
];

// ── Slash Command Popup ───────────────────────────────────────────
function SlashMenu({
  query,
  onSelect,
  onClose,
}: {
  query: string;
  onSelect: (item: (typeof SLASH_ITEMS)[0]) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const filtered = SLASH_ITEMS.filter((i) =>
    i.title.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[active]) onSelect(filtered[active]);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, filtered, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-[var(--content-border)] rounded-xl shadow-lg py-1 min-w-[200px]"
      style={{ top: "calc(100% + 4px)", left: 0 }}
    >
      {filtered.map((item, i) => (
        <button
          type="button"
          key={item.title}
          title={item.title}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors"
          style={{
            background: i === active ? "#F5F3FF" : "transparent",
            color: i === active ? "var(--vyne-purple)" : "var(--text-primary)",
          }}
          onMouseEnter={() => setActive(i)}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{
              background:
                i === active
                  ? "rgba(6, 182, 212,0.12)"
                  : "var(--content-bg-secondary)",
              color:
                i === active ? "var(--vyne-purple)" : "var(--text-secondary)",
            }}
          >
            {item.icon}
          </span>
          {item.title}
        </button>
      ))}
    </div>
  );
}

// ── Toolbar Button ────────────────────────────────────────────────
function TB({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors"
      style={{
        background: active ? "rgba(6, 182, 212,0.1)" : undefined,
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--content-bg-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = "";
      }}
    >
      {children}
    </button>
  );
}

// ── DocEditor ─────────────────────────────────────────────────────
interface DocEditorProps {
  doc: Document;
}

export function DocEditor({ doc }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const slashStartPos = useRef<number | null>(null);
  const updateDoc = useUpdateDoc();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Version history state ─────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<DocVersion[]>(() =>
    loadVersions(doc.id),
  );
  const [diffVersion, setDiffVersion] = useState<DocVersion | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    text: string;
    anchor: number;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Reload versions when doc changes
  useEffect(() => {
    setVersions(loadVersions(doc.id));
    setDiffVersion(null);
    setAiSuggestion(null);
  }, [doc.id]);

  // ── Real-time collaboration (y-webrtc) ────────────────────────
  const currentUser = useAuthStore((s) => s.user);
  const {
    ydoc,
    provider,
    users: collabUsers,
    status: collabStatus,
  } = useCollab({
    docId: doc.id,
    userId: currentUser?.id ?? "anon",
    userName: currentUser?.name ?? "Guest",
  });

  // ── Debounced save ────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (content: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateDoc.mutate({ id: doc.id, data: { content } });
      }, 1000);

      // Snapshot a version every 30 s of inactivity (debounced)
      if (versionTimer.current) clearTimeout(versionTimer.current);
      versionTimer.current = setTimeout(() => {
        saveVersion(doc.id, title, content);
        setVersions(loadVersions(doc.id));
      }, 30_000);
    },
    [doc.id, title, updateDoc],
  );

  const scheduleTitleSave = useCallback(
    (newTitle: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (newTitle.trim()) {
          updateDoc.mutate({ id: doc.id, data: { title: newTitle.trim() } });
        }
      }, 800);
    },
    [doc.id, updateDoc],
  );

  // ── TipTap editor ─────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        heading: { levels: [1, 2, 3] },
        // Disable StarterKit's history when collab is active — Yjs owns undo/redo
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return "Write something, or type / for commands…";
        },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Collaboration.configure({ document: ydoc }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: {
                name: currentUser?.name ?? "Guest",
                color: "#06B6D4",
              },
            }),
          ]
        : []),
    ],
    content: (() => {
      if (!doc.content) return "";
      try {
        const parsed = JSON.parse(doc.content);
        // Accept both TipTap JSON (type: "doc") and legacy plain-text wrapper
        if (parsed?.type === "doc") return parsed;
        if (parsed?.text && typeof parsed.text === "string") return parsed.text;
        return "";
      } catch {
        return doc.content;
      }
    })(),
    onUpdate({ editor: e }) {
      const json = JSON.stringify(e.getJSON());
      scheduleSave(json);

      // Handle slash command detection
      const { from } = e.state.selection;
      const textBefore = e.state.doc.textBetween(
        Math.max(0, from - 20),
        from,
        "\n",
      );
      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex !== -1 && !textBefore.slice(slashIndex).includes(" ")) {
        const query = textBefore.slice(slashIndex + 1);
        slashStartPos.current = from - query.length - 1;
        setSlashQuery(query);
        setSlashOpen(true);
      } else {
        setSlashOpen(false);
        slashStartPos.current = null;
      }
    },
    immediatelyRender: false,
  });

  // Sync when switching docs
  useEffect(() => {
    setTitle(doc.title);
    if (!editor) return;
    const content = (() => {
      if (!doc.content) return "";
      try {
        const parsed = JSON.parse(doc.content);
        if (parsed?.type === "doc") return parsed;
        if (parsed?.text && typeof parsed.text === "string") return parsed.text;
        return "";
      } catch {
        return doc.content;
      }
    })();
    editor.commands.setContent(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // ── AI ghost-text suggestion ──────────────────────────────────
  const requestSuggestion = useCallback(
    async (
      mode:
        | "continue"
        | "improve"
        | "shorter"
        | "longer"
        | "summarise" = "continue",
    ) => {
      if (!editor) return;
      setAiLoading(true);
      try {
        const { from } = editor.state.selection;
        const contextText = editor.state.doc.textBetween(
          Math.max(0, from - 600),
          from,
          "\n",
        );
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: contextText || "Start writing…",
            mode,
          }),
        });
        const data = (await res.json()) as {
          suggestion?: string;
          error?: string;
        };
        if (data.suggestion) {
          setAiSuggestion({ text: data.suggestion, anchor: from });
        }
      } catch {
        // ignore — suggestion just won't appear
      } finally {
        setAiLoading(false);
      }
    },
    [editor],
  );

  const acceptSuggestion = useCallback(() => {
    if (!editor || !aiSuggestion) return;
    editor
      .chain()
      .focus()
      .insertContentAt(aiSuggestion.anchor, aiSuggestion.text)
      .run();
    setAiSuggestion(null);
  }, [editor, aiSuggestion]);

  // Dismiss suggestion on Escape, accept on Tab when it's visible
  useEffect(() => {
    if (!aiSuggestion) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        acceptSuggestion();
      }
      if (e.key === "Escape") {
        setAiSuggestion(null);
      }
    }
    globalThis.addEventListener("keydown", handler, true);
    return () => globalThis.removeEventListener("keydown", handler, true);
  }, [aiSuggestion, acceptSuggestion]);

  function handleSlashSelect(item: (typeof SLASH_ITEMS)[0]) {
    if (!editor || slashStartPos.current === null) return;
    const { from } = editor.state.selection;
    // Delete the "/query" text, then run the block command
    editor
      .chain()
      .focus()
      .deleteRange({ from: slashStartPos.current, to: from })
      .run();
    item.command(editor);
    setSlashOpen(false);
    slashStartPos.current = null;
    setSlashQuery("");
  }

  const isSaving = updateDoc.isPending;
  const charCount = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-6 py-2 border-b border-[var(--content-border)] flex-shrink-0 flex-wrap"
        style={{ background: "var(--content-secondary)" }}
      >
        <TB
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor?.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={14} />
        </TB>
        <TB
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor?.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </TB>
        <TB
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor?.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={14} />
        </TB>
        <div className="w-px h-4 bg-[var(--content-border)] mx-1" />
        <TB
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          title="Bold"
        >
          <Bold size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          title="Italic"
        >
          <Italic size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleCode().run()}
          active={editor?.isActive("code")}
          title="Inline code"
        >
          <Code size={14} />
        </TB>
        <div className="w-px h-4 bg-[var(--content-border)] mx-1" />
        <TB
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          title="Bullet list"
        >
          <List size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          title="Ordered list"
        >
          <ListOrdered size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive("codeBlock")}
          title="Code block"
        >
          <Code2 size={14} />
        </TB>
        <TB
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={14} />
        </TB>
        <TB
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          active={editor?.isActive("table")}
          title="Table"
        >
          <TableIcon size={14} />
        </TB>

        {/* Right side: AI + whiteboard + comments + image + history + char count + save + presence */}
        <div
          className="ml-auto flex items-center gap-3 text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <TB
            onClick={() => requestSuggestion("continue")}
            title="AI: continue writing (Tab to accept)"
            active={aiLoading || Boolean(aiSuggestion)}
          >
            <Sparkles size={14} />
          </TB>
          <TB
            onClick={() => setShowWhiteboard((v) => !v)}
            title="Insert whiteboard"
            active={showWhiteboard}
          >
            <PencilRuler size={14} />
          </TB>
          <TB
            onClick={() => setShowComments((v) => !v)}
            title="Comments"
            active={showComments}
          >
            <MessageCircle size={14} />
          </TB>
          <TB
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
          >
            <ImageIcon size={14} />
          </TB>
          <TB
            onClick={() => {
              if (!showHistory) {
                // Snapshot current state before opening
                const content = editor ? JSON.stringify(editor.getJSON()) : "";
                saveVersion(doc.id, title, content);
                setVersions(loadVersions(doc.id));
              }
              setShowHistory(!showHistory);
            }}
            active={showHistory}
            title="Version history"
          >
            <History size={14} />
          </TB>
          <div className="w-px h-4 bg-[var(--content-border)]" />
          <CollabPresence users={collabUsers} status={collabStatus} />
          <div className="w-px h-4 bg-[var(--content-border)]" />
          <span>{charCount.toLocaleString()} chars</span>
          <span>{isSaving ? "Saving…" : "Saved"}</span>
        </div>
      </div>
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload image"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !editor) return;
          const formData = new FormData();
          formData.append("file", file);
          try {
            const res = await fetch("/api/upload-image", {
              method: "POST",
              body: formData,
            });
            const data = (await res.json()) as { url?: string; error?: string };
            if (res.ok && data.url) {
              editor
                .chain()
                .focus()
                .setImage({ src: data.url, alt: file.name })
                .run();
            } else {
              // Fallback to local base64 if the upload endpoint failed for any reason.
              const reader = new FileReader();
              reader.onload = (ev) => {
                const src = ev.target?.result as string;
                if (src)
                  editor
                    .chain()
                    .focus()
                    .setImage({ src, alt: file.name })
                    .run();
              };
              reader.readAsDataURL(file);
            }
          } catch {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              if (src)
                editor.chain().focus().setImage({ src, alt: file.name }).run();
            };
            reader.readAsDataURL(file);
          }
          e.target.value = "";
        }}
      />

      {/* Content area */}
      <div className="flex-1 overflow-auto relative">
        <div className="max-w-[720px] mx-auto px-8 py-10">
          {/* Doc icon */}
          {doc.icon && (
            <div className="text-5xl mb-3 leading-none">{doc.icon}</div>
          )}

          {/* Title */}
          <input
            ref={titleRef}
            className="w-full text-[2rem] font-bold text-[var(--text-primary)] bg-transparent border-none outline-none placeholder:text-[#D0D0E0] mb-6"
            placeholder="Untitled"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleTitleSave(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus();
              }
            }}
          />

          {/* Presence + reactions row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <PresenceIndicator subjectId={`doc:${doc.id}`} verb="editing" />
            <div style={{ flex: 1 }} />
            <ReactionsBar subjectId={`doc:${doc.id}`} compact />
          </div>

          {/* TipTap body */}
          <div className="relative">
            {slashOpen && (
              <SlashMenu
                query={slashQuery}
                onSelect={handleSlashSelect}
                onClose={() => {
                  setSlashOpen(false);
                  slashStartPos.current = null;
                }}
              />
            )}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>

        {/* Version history panel (overlays content area) */}
        {showHistory && (
          <VersionHistoryPanel
            versions={versions}
            onClose={() => setShowHistory(false)}
            onCompare={(v) => setDiffVersion(v)}
            onRestore={(v) => {
              setTitle(v.title);
              try {
                const parsed = JSON.parse(v.content);
                editor?.commands.setContent(
                  parsed?.type === "doc" ? parsed : v.content,
                );
              } catch {
                editor?.commands.setContent(v.content);
              }
              updateDoc.mutate({
                id: doc.id,
                data: { title: v.title, content: v.content },
              });
            }}
          />
        )}

        {/* AI suggestion ghost-text floating hint */}
        {aiSuggestion && (
          <div
            role="status"
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: 620,
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--content-bg)",
              border: "1px solid rgba(6, 182, 212,0.3)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              zIndex: 25,
            }}
          >
            <Sparkles
              size={14}
              style={{
                color: "var(--vyne-purple)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--vyne-purple)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                AI suggestion — press Tab to accept
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {aiSuggestion.text}
              </div>
            </div>
            <button
              type="button"
              onClick={acceptSuggestion}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: "var(--vyne-purple)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Accept
            </button>
            <button
              type="button"
              aria-label="Dismiss suggestion"
              onClick={() => setAiSuggestion(null)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Whiteboard drawer ──────────────────────────────────── */}
      {showWhiteboard && (
        <div
          style={{
            padding: 16,
            borderTop: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <PencilRuler size={13} style={{ color: "var(--vyne-purple)" }} />
              Whiteboard
            </span>
            <button
              type="button"
              aria-label="Close whiteboard"
              onClick={() => setShowWhiteboard(false)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
          <WhiteboardCanvas height={320} />
        </div>
      )}

      {/* ── Comments drawer ────────────────────────────────────── */}
      {showComments && (
        <div
          style={{
            padding: 16,
            borderTop: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <CommentsPanel
            subjectId={`doc:${doc.id}`}
            label={`Comments on "${title}"`}
          />
        </div>
      )}

      {/* ── Diff viewer modal ──────────────────────────────────── */}
      {diffVersion && editor && (
        <div
          role="dialog"
          aria-label="Compare versions"
          aria-modal="true"
          onClick={() => setDiffVersion(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1100,
              maxHeight: "90vh",
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--content-border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <GitCompare size={16} style={{ color: "var(--vyne-purple)" }} />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Compare versions
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDiffVersion(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: 20, overflow: "auto" }}>
              <DiffViewer
                mode="split"
                left={{
                  title: diffVersion.title,
                  content: (() => {
                    try {
                      const parsed = JSON.parse(diffVersion.content);
                      if (parsed?.type === "doc") {
                        // Extract plain text from TipTap JSON for diffing
                        return JSON.stringify(parsed);
                      }
                      return String(parsed?.text ?? diffVersion.content);
                    } catch {
                      return diffVersion.content;
                    }
                  })(),
                  label: `v${diffVersion.id.slice(-6)} · ${new Date(
                    diffVersion.savedAt,
                  ).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`,
                }}
                right={{
                  title,
                  content: JSON.stringify(editor.getJSON()),
                  label: "Current draft",
                }}
              />
            </div>
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--content-border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setDiffVersion(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editor) return;
                  setTitle(diffVersion.title);
                  try {
                    const parsed = JSON.parse(diffVersion.content);
                    editor.commands.setContent(
                      parsed?.type === "doc" ? parsed : diffVersion.content,
                    );
                  } catch {
                    editor.commands.setContent(diffVersion.content);
                  }
                  updateDoc.mutate({
                    id: doc.id,
                    data: {
                      title: diffVersion.title,
                      content: diffVersion.content,
                    },
                  });
                  setDiffVersion(null);
                  setShowHistory(false);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Restore this version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TipTap styles */}
      <style>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 60vh;
          font-size: 15px;
          line-height: 1.75;
          color: var(--text-primary);
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-tertiary);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 1.4rem 0 0.4rem;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin: 1.2rem 0 0.3rem;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.15rem; font-weight: 600; color: var(--text-primary); margin: 1rem 0 0.25rem;
        }
        .tiptap-editor .ProseMirror p { margin: 0.35rem 0; }
        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol { padding-left: 1.4rem; margin: 0.35rem 0; }
        .tiptap-editor .ProseMirror li { margin: 0.2rem 0; }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid var(--vyne-purple);
          margin: 0.5rem 0;
          padding: 0.25rem 0 0.25rem 1rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .tiptap-editor .ProseMirror code {
          background: var(--content-secondary);
          border-radius: 4px;
          font-size: 0.875em;
          padding: 0.15em 0.35em;
          font-family: 'Fira Code', 'Cascadia Code', monospace;
          color: var(--vyne-purple);
        }
        .tiptap-editor .ProseMirror pre {
          background: var(--text-primary);
          border-radius: 8px;
          padding: 1rem;
          margin: 0.75rem 0;
          overflow-x: auto;
        }
        .tiptap-editor .ProseMirror pre code {
          background: none;
          color: #E8E8F8;
          padding: 0;
          font-size: 0.85rem;
        }
        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--content-border);
          margin: 1.5rem 0;
        }
        .tiptap-editor .ProseMirror table {
          border-collapse: collapse;
          margin: 0.75rem 0;
          width: 100%;
          overflow: hidden;
        }
        .tiptap-editor .ProseMirror table td,
        .tiptap-editor .ProseMirror table th {
          border: 1px solid var(--content-border);
          padding: 8px 12px;
          font-size: 13px;
          text-align: left;
          min-width: 80px;
        }
        .tiptap-editor .ProseMirror table th {
          background: var(--table-header-bg);
          font-weight: 600;
          color: var(--text-primary);
        }
        .tiptap-editor .ProseMirror table .selectedCell {
          background: rgba(6, 182, 212,0.06);
        }
        .tiptap-editor .ProseMirror .is-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: #C8C8D8;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.75rem 0;
          display: block;
        }
        .tiptap-editor .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #06B6D4;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
