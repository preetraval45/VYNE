"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
      { keys: ["/"], action: "Focus in-page search" },
      { keys: ["C"], action: "Create in current module" },
      { keys: ["F"], action: "Toggle focus mode" },
      { keys: ["Ctrl", "B"], action: "Toggle sidebar" },
      { keys: ["Esc"], action: "Close modals / overlays" },
    ],
  },
  {
    title: "Go to…",
    items: [
      { keys: ["G", "H"], action: "Home" },
      { keys: ["G", "P"], action: "Projects" },
      { keys: ["G", "C"], action: "Chat" },
      { keys: ["G", "D"], action: "Docs" },
      { keys: ["G", "O"], action: "Ops / ERP" },
      { keys: ["G", "F"], action: "Finance" },
      { keys: ["G", "I"], action: "Invoicing" },
      { keys: ["G", "R"], action: "CRM" },
      { keys: ["G", "S"], action: "Sales" },
      { keys: ["G", "E"], action: "Expenses" },
      { keys: ["G", "M"], action: "HR (Members)" },
      { keys: ["G", "N"], action: "Contacts" },
      { keys: ["G", "A"], action: "AI" },
      { keys: ["G", "B"], action: "Roadmap" },
      { keys: ["G", ","], action: "Settings" },
    ],
  },
  {
    title: "Create…",
    items: [
      { keys: ["C"], action: "Primary create for current page" },
      { keys: ["C", "P"], action: "Project" },
      { keys: ["C", "D"], action: "CRM deal" },
      { keys: ["C", "I"], action: "Invoice" },
      { keys: ["C", "B"], action: "Bill" },
      { keys: ["C", "E"], action: "Expense" },
      { keys: ["C", "J"], action: "Journal entry" },
      { keys: ["C", "C"], action: "Channel" },
      { keys: ["C", "Q"], action: "Quote" },
      { keys: ["C", "O"], action: "Ops order" },
      { keys: ["C", "A"], action: "Contact account" },
      { keys: ["C", "N"], action: "Contact person" },
      { keys: ["C", "R"], action: "Feature request" },
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

/**
 * Given the current pathname, returns the URL that "c" alone should
 * navigate to for a context-aware create action. Returns null if no
 * sensible default exists on this page (in which case we fall back to
 * opening the command palette).
 */
function primaryCreateForPath(path: string | null): string | null {
  if (!path) return null;
  const routes: Array<[RegExp, string]> = [
    [/^\/projects(\/|$)/, "/projects/new"],
    [/^\/crm(\/|$)/, "/crm/deals/new"],
    [/^\/finance(\/|$)/, "/finance/journal/new"],
    [/^\/contacts(\/|$)/, "/contacts/people/new"],
    [/^\/expenses(\/|$)/, "/expenses/new"],
    [/^\/sales(\/|$)/, "/sales/opportunities/new"],
    [/^\/invoicing(\/|$)/, "/invoicing/invoices/new"],
    [/^\/ops(\/|$)/, "/ops/orders/new"],
    [/^\/hr(\/|$)/, "/hr"],
    [/^\/chat(\/|$)/, "/chat/new"],
    [/^\/roadmap(\/|$)/, "/roadmap/request"],
  ];
  for (const [re, target] of routes) {
    if (re.test(path)) return target;
  }
  return null;
}

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

// Sequence target tables — hoisted so the effect deps stay stable.
const GO_ROUTES: Record<string, string> = {
  h: "/home",
  p: "/projects",
  c: "/chat",
  d: "/docs",
  o: "/ops",
  f: "/finance",
  i: "/invoicing",
  r: "/crm",
  s: "/sales",
  e: "/expenses",
  m: "/hr",
  n: "/contacts",
  a: "/ai",
  b: "/roadmap",
  ",": "/settings",
};

const CREATE_ROUTES: Record<string, string> = {
  p: "/projects/new",
  d: "/crm/deals/new",
  i: "/invoicing/invoices/new",
  b: "/invoicing/bills/new",
  e: "/expenses/new",
  j: "/finance/journal/new",
  c: "/chat/new",
  q: "/sales/quotes/new",
  o: "/ops/orders/new",
  a: "/contacts/accounts/new",
  n: "/contacts/people/new",
  r: "/roadmap/request",
};

export function KeyboardShortcutsModal() {
  const router = useRouter();
  const pathname = usePathname();
  const shortcutsOpen = useUIStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const toggleShortcuts = useUIStore((s) => s.toggleShortcuts);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);

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

    /** Find a prominent search/filter input on the current page. */
    function focusInPageSearch(): boolean {
      const selectors = [
        'input[type="search"]',
        'input[aria-label*="Search" i]',
        'input[placeholder*="Search" i]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector<HTMLInputElement>(sel);
        if (el) {
          el.focus();
          el.select?.();
          return true;
        }
      }
      return false;
    }

    function handler(e: KeyboardEvent) {
      // Always allow Escape to close the shortcuts modal, even from within inputs
      if (e.key === "Escape" && shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }

      // Ignore all hotkeys while typing — except the palette opener (Ctrl/⌘+K)
      if (isTypingTarget(e.target)) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setCommandPaletteOpen(!commandPaletteOpen);
        }
        return;
      }

      // "?" — show shortcuts
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // "/" — focus in-page search. Falls back to command palette.
      if (e.key === "/" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const focused = focusInPageSearch();
        if (focused) {
          e.preventDefault();
          return;
        }
        // no search on this page → open the palette instead
        e.preventDefault();
        setCommandPaletteOpen(true);
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
        const second = e.key.toLowerCase();
        if (lastKey === "g" && GO_ROUTES[second]) {
          e.preventDefault();
          router.push(GO_ROUTES[second]);
          lastKey = null;
          return;
        }
        if (lastKey === "c" && CREATE_ROUTES[second]) {
          e.preventDefault();
          router.push(CREATE_ROUTES[second]);
          lastKey = null;
          return;
        }
        lastKey = null;
      }

      // Arm a sequence key…
      if (["g", "c"].includes(e.key.toLowerCase()) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        lastKey = e.key.toLowerCase();
        lastKeyAt = now;

        // If C isn't followed by a second key within 500 ms, treat it as a
        // standalone context-aware create shortcut.
        if (lastKey === "c") {
          const armedAt = now;
          window.setTimeout(() => {
            if (lastKey === "c" && lastKeyAt === armedAt) {
              lastKey = null;
              const target = primaryCreateForPath(pathname);
              if (target) {
                router.push(target);
              } else {
                setCommandPaletteOpen(true);
              }
            }
          }, 500);
        }
        return;
      }

      lastKey = null;
    }

    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [
    shortcutsOpen,
    commandPaletteOpen,
    setShortcutsOpen,
    toggleShortcuts,
    toggleFocusMode,
    toggleSidebar,
    setCommandPaletteOpen,
    router,
    pathname,
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
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--vyne-accent, var(--vyne-purple))",
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
