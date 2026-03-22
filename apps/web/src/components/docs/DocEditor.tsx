"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { useUpdateDoc } from "@/hooks/useDocs";
import type { Document } from "@/types";

interface DocEditorProps {
  doc: Document;
}

// Simple debounce utility
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay],
  );
}

// ── Toolbar Button ────────────────────────────────────────────────
function ToolbarButton({
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
      title={title}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors"
      style={{
        background: active ? "rgba(108,71,255,0.1)" : undefined,
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = "#F8F8FC";
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

// ── Format helpers ────────────────────────────────────────────────
function getSelectedText(textarea: HTMLTextAreaElement): {
  text: string;
  start: number;
  end: number;
} {
  return {
    text: textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd,
    ),
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  setValue: (v: string) => void,
  before: string,
  after: string,
) {
  const { text, start, end } = getSelectedText(textarea);
  const newValue =
    textarea.value.substring(0, start) +
    before +
    text +
    after +
    textarea.value.substring(end);
  setValue(newValue);
  // Restore selection after React re-render
  setTimeout(() => {
    textarea.setSelectionRange(start + before.length, end + before.length);
    textarea.focus();
  }, 0);
}

function prependLine(
  textarea: HTMLTextAreaElement,
  setValue: (v: string) => void,
  prefix: string,
) {
  const { start } = getSelectedText(textarea);
  const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
  const newValue =
    textarea.value.substring(0, lineStart) +
    prefix +
    textarea.value.substring(lineStart);
  setValue(newValue);
  setTimeout(() => {
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    textarea.focus();
  }, 0);
}

// ── DocEditor ─────────────────────────────────────────────────────
export function DocEditor({ doc }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(() => {
    // If content is stored as TipTap JSON, attempt to extract plain text for editing
    if (!doc.content) return "";
    try {
      const parsed = JSON.parse(doc.content);
      // Simple TipTap JSON -> plain text extraction
      return extractPlainText(parsed);
    } catch {
      return doc.content;
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateDoc = useUpdateDoc();

  // Sync when doc changes (e.g. navigating to another doc)
  useEffect(() => {
    setTitle(doc.title);
    setContent(() => {
      if (!doc.content) return "";
      try {
        const parsed = JSON.parse(doc.content);
        return extractPlainText(parsed);
      } catch {
        return doc.content;
      }
    });
  }, [doc.id, doc.title, doc.content]);

  // Auto-save content with 1000ms debounce
  const saveContent = useDebouncedCallback(
    (docId: string, newContent: string) => {
      updateDoc.mutate({
        id: docId,
        data: { content: JSON.stringify({ type: "doc", text: newContent }) },
      });
    },
    1000,
  );

  // Auto-save title with 800ms debounce
  const saveTitle = useDebouncedCallback((docId: string, newTitle: string) => {
    if (newTitle.trim()) {
      updateDoc.mutate({ id: docId, data: { title: newTitle.trim() } });
    }
  }, 800);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    saveTitle(doc.id, e.target.value);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    saveContent(doc.id, e.target.value);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      textareaRef.current?.focus();
    }
  }

  // ── Toolbar actions ───────────────────────────────────────────────
  function applyBold() {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, setContent, "**", "**");
  }
  function applyItalic() {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, setContent, "_", "_");
  }
  function applyStrike() {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, setContent, "~~", "~~");
  }
  function applyCode() {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, setContent, "`", "`");
  }
  function applyH1() {
    if (textareaRef.current) prependLine(textareaRef.current, setContent, "# ");
  }
  function applyH2() {
    if (textareaRef.current)
      prependLine(textareaRef.current, setContent, "## ");
  }
  function applyH3() {
    if (textareaRef.current)
      prependLine(textareaRef.current, setContent, "### ");
  }
  function applyBullet() {
    if (textareaRef.current) prependLine(textareaRef.current, setContent, "- ");
  }
  function applyOrdered() {
    if (textareaRef.current)
      prependLine(textareaRef.current, setContent, "1. ");
  }
  function applyQuote() {
    if (textareaRef.current) prependLine(textareaRef.current, setContent, "> ");
  }
  function applyDivider() {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const { start } = getSelectedText(ta);
    const hr = "\n---\n";
    const newValue =
      ta.value.substring(0, start) + hr + ta.value.substring(start);
    setContent(newValue);
    setTimeout(() => {
      ta.setSelectionRange(start + hr.length, start + hr.length);
      ta.focus();
    }, 0);
  }

  const isSaving = updateDoc.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-6 py-2 border-b border-[#E8E8F0] flex-shrink-0"
        style={{ background: "#FAFAFE" }}
      >
        <ToolbarButton onClick={applyH1} title="Heading 1">
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyH2} title="Heading 2">
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyH3} title="Heading 3">
          <Heading3 size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-[#E8E8F0] mx-1" />
        <ToolbarButton onClick={applyBold} title="Bold">
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyItalic} title="Italic">
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyStrike} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyCode} title="Inline code">
          <Code size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-[#E8E8F0] mx-1" />
        <ToolbarButton onClick={applyBullet} title="Bullet list">
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyOrdered} title="Ordered list">
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyQuote} title="Blockquote">
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={applyDivider} title="Horizontal rule">
          <Minus size={14} />
        </ToolbarButton>
        {/* Save indicator */}
        <div
          className="ml-auto text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isSaving ? "Saving..." : "Saved"}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto px-8 py-10">
          {/* Doc icon */}
          {doc.icon && (
            <div className="text-5xl mb-3 leading-none">{doc.icon}</div>
          )}

          {/* Title */}
          <input
            className="w-full text-[2rem] font-bold text-[#1A1A2E] bg-transparent border-none outline-none placeholder:text-[#D0D0E0] mb-6"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
          />

          {/* Body */}
          <textarea
            ref={textareaRef}
            className="w-full min-h-[60vh] resize-none bg-transparent border-none outline-none text-[15px] leading-relaxed placeholder:text-[#C8C8D8] font-mono"
            style={{ color: "#2A2A4A" }}
            placeholder="Start writing… (Markdown supported)"
            value={content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}

// ── Utility: extract plain text from TipTap JSON ──────────────────
function extractPlainText(node: Record<string, unknown>): string {
  if (!node || typeof node !== "object") return "";
  if (node["type"] === "text")
    return (node["text"] as string | undefined) ?? "";
  if (node["text"] && typeof node["text"] === "string") return node["text"];
  const content = node["content"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(content)) {
    return content.map(extractPlainText).join("");
  }
  return "";
}
