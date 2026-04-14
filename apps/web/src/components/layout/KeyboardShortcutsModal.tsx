"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui";

interface Shortcut {
  keys: string[];
  action: string;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    items: [
      { keys: ["?"], action: "Show this cheat sheet" },
      { keys: ["Ctrl", "K"], action: "Open command palette" },
      { keys: ["F"], action: "Toggle focus mode" },
      { keys: ["Ctrl", "B"], action: "Toggle sidebar" },
      { keys: ["Esc"], action: "Close modals / overlays" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { keys: ["G", "H"], action: "Go to Home" },
      { keys: ["G", "P"], action: "Go to Projects" },
      { keys: ["G", "C"], action: "Go to Chat" },
      { keys: ["G", "D"], action: "Go to Docs" },
      { keys: ["G", "O"], action: "Go to ERP / Operations" },
      { keys: ["G", "F"], action: "Go to Finance" },
      { keys: ["G", "A"], action: "Go to AI Dashboard" },
      { keys: ["G", "S"], action: "Go to Settings" },
    ],
  },
  {
    title: "Create",
    items: [
      { keys: ["C", "I"], action: "Create new issue" },
      { keys: ["C", "D"], action: "Create new doc" },
      { keys: ["C", "M"], action: "Post a message" },
      { keys: ["C", "O"], action: "Create new order" },
    ],
  },
  {
    title: "Chat / Docs",
    items: [
      { keys: ["/"], action: "Open slash-command menu" },
      { keys: ["@"], action: "Mention a teammate" },
      { keys: ["Ctrl", "Enter"], action: "Send message" },
      { keys: ["↑"], action: "Edit last message" },
      { keys: ["Ctrl", "Z"], action: "Undo" },
      { keys: ["Ctrl", "⇧", "Z"], action: "Redo" },
    ],
  },
];

function KeyBadge({ keyText }: { keyText: string }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 26,
        padding: "0 8px",
        borderRadius: 6,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 11,
        fontWeight: 600,
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
        color: "var(--text-primary)",
        boxShadow: "0 1px 0 var(--content-border)",
      }}
    >
      {keyText}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const router = useRouter();
  const shortcutsOpen = useUIStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const toggleShortcuts = useUIStore((s) => s.toggleShortcuts);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  // Global key bindings
  useEffect(() => {
    let lastKey: string | null = null;
    let lastKeyAt = 0;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      // Always listen for Escape inside the modal
      if (e.key === "Escape" && shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }

      if (isTypingTarget(e.target)) return;

      // "?" — show shortcuts
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // "F" — focus mode
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Ctrl/⌘ + B — toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Sequence shortcuts (G + x, C + x)
      const now = Date.now();
      if (lastKey && now - lastKeyAt < 1200) {
        const seq = `${lastKey}${e.key.toLowerCase()}`;
        const routes: Record<string, string> = {
          gh: "/home",
          gp: "/projects",
          gc: "/chat",
          gd: "/docs",
          go: "/ops",
          gf: "/finance",
          ga: "/ai",
          gs: "/settings",
        };
        const creates: Record<string, () => void> = {
          ci: () => router.push("/projects?new=1"),
          cd: () => router.push("/docs?new=1"),
          cm: () => router.push("/chat"),
          co: () => router.push("/ops?tab=orders&new=1"),
          ck: () => setCommandPaletteOpen(true),
        };
        if (routes[seq]) {
          e.preventDefault();
          router.push(routes[seq]);
          lastKey = null;
          return;
        }
        if (creates[seq]) {
          e.preventDefault();
          creates[seq]();
          lastKey = null;
          return;
        }
      }

      if (["g", "c"].includes(e.key.toLowerCase()) && !e.ctrlKey && !e.metaKey) {
        lastKey = e.key.toLowerCase();
        lastKeyAt = now;
      } else {
        lastKey = null;
      }
    }

    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [
    shortcutsOpen,
    setShortcutsOpen,
    toggleShortcuts,
    toggleFocusMode,
    toggleSidebar,
    setCommandPaletteOpen,
    router,
  ]);

  if (!shortcutsOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
      onClick={() => setShortcutsOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px 24px 24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(108,71,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--vyne-purple)",
            }}
          >
            <Keyboard size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Keyboard shortcuts
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Press <KeyBadge keyText="?" /> anywhere to open this sheet
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShortcutsOpen(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            overflow: "auto",
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                  marginBottom: 10,
                }}
              >
                {group.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.items.map((s) => (
                  <div
                    key={s.action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>{s.action}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {s.keys.map((k, i) => (
                        <span key={`${s.action}-${k}-${i}`} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {i > 0 && (
                            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                              then
                            </span>
                          )}
                          <KeyBadge keyText={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--content-border)",
            fontSize: 12,
            color: "var(--text-tertiary)",
            background: "var(--content-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            Sequences like <KeyBadge keyText="G" /> <KeyBadge keyText="H" /> let you navigate without touching the mouse.
          </span>
          <span>
            Esc to close
          </span>
        </div>
      </div>
    </div>
  );
}
