"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  Target,
  User,
  Building2,
  Receipt,
  Package,
  ShoppingCart,
  X,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { useProjectsStore } from "@/lib/stores/projects";
import { useCRMStore } from "@/lib/stores/crm";
import { useContactsStore } from "@/lib/stores/contacts";
import { useInvoicingStore } from "@/lib/stores/invoicing";
import { useOpsStore } from "@/lib/stores/ops";

/* ── Types ────────────────────────────────────────────────────────── */

interface Hit {
  id: string;
  kind: "Project" | "Deal" | "Account" | "Contact" | "Invoice" | "Product" | "Order";
  title: string;
  subtitle?: string;
  href: string;
  icon: ReactNode;
  score: number;
}

function iconFor(kind: Hit["kind"]): ReactNode {
  const common = { size: 14 } as const;
  const map: Record<Hit["kind"], ReactNode> = {
    Project: <LayoutGrid {...common} style={{ color: "var(--vyne-purple)" }} />,
    Deal: <Target {...common} style={{ color: "#8B5CF6" }} />,
    Account: <Building2 {...common} style={{ color: "#6366F1" }} />,
    Contact: <User {...common} style={{ color: "#06B6D4" }} />,
    Invoice: <Receipt {...common} style={{ color: "#22C55E" }} />,
    Product: <Package {...common} style={{ color: "#F59E0B" }} />,
    Order: <ShoppingCart {...common} style={{ color: "#EC4899" }} />,
  };
  return map[kind];
}

function score(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  const idx = h.indexOf(n);
  if (idx === 0) return 70;
  if (idx > 0) return 50 - Math.min(idx, 30);
  return 0;
}

/* ── Modal ────────────────────────────────────────────────────────── */

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pull from stores
  const projects = useProjectsStore((s) => s.projects);
  const tasks = useProjectsStore((s) => s.tasks);
  const deals = useCRMStore((s) => s.deals);
  const accounts = useContactsStore((s) => s.accounts);
  const contacts = useContactsStore((s) => s.contacts);
  const invoices = useInvoicingStore((s) => s.invoices);
  const products = useOpsStore((s) => s.products);
  const orders = useOpsStore((s) => s.orders);

  /* Build the full hit list; filter/score against the query. */
  const hits = useMemo<Hit[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: Hit[] = [];

    for (const p of projects) {
      const s = Math.max(score(p.name, q), score(p.identifier ?? "", q));
      if (s > 0) {
        out.push({
          id: `project-${p.id}`,
          kind: "Project",
          title: p.name,
          subtitle: `${p.identifier ?? "PRJ"} · ${p.description ?? ""}`.trim(),
          href: `/projects?detail=${p.id}`,
          icon: iconFor("Project"),
          score: s + 10,
        });
      }
    }

    for (const t of tasks) {
      const s = score(t.title, q);
      if (s > 0) {
        const proj = projects.find((p) => p.id === t.projectId);
        out.push({
          id: `task-${t.id}`,
          kind: "Project",
          title: t.title,
          subtitle: proj ? `Task in ${proj.name}` : "Task",
          href: proj ? `/projects/${proj.id}` : "/projects",
          icon: iconFor("Project"),
          score: s,
        });
      }
    }

    for (const d of deals) {
      const s = Math.max(
        score(d.company, q),
        score(d.contactName, q),
        score(d.email ?? "", q),
      );
      if (s > 0) {
        out.push({
          id: `deal-${d.id}`,
          kind: "Deal",
          title: d.company,
          subtitle: `${d.contactName} · ${d.stage} · $${d.value.toLocaleString()}`,
          href: `/crm?opp=${d.id}`,
          icon: iconFor("Deal"),
          score: s + 5,
        });
      }
    }

    for (const a of accounts) {
      const s = Math.max(score(a.name, q), score(a.industry, q), score(a.owner, q));
      if (s > 0) {
        out.push({
          id: `account-${a.id}`,
          kind: "Account",
          title: a.name,
          subtitle: `${a.industry} · ${a.employees.toLocaleString()} employees`,
          href: `/contacts?account=${a.id}`,
          icon: iconFor("Account"),
          score: s,
        });
      }
    }

    for (const c of contacts) {
      const s = Math.max(score(c.name, q), score(c.email, q), score(c.title, q));
      if (s > 0) {
        out.push({
          id: `contact-${c.id}`,
          kind: "Contact",
          title: c.name,
          subtitle: `${c.title} · ${c.company}`,
          href: `/contacts?contact=${c.id}`,
          icon: iconFor("Contact"),
          score: s,
        });
      }
    }

    for (const inv of invoices) {
      const s = Math.max(score(inv.number, q), score(inv.customer, q));
      if (s > 0) {
        out.push({
          id: `invoice-${inv.id}`,
          kind: "Invoice",
          title: inv.number,
          subtitle: `${inv.customer} · $${inv.amount.toLocaleString()} · ${inv.status}`,
          href: `/invoicing?invoice=${inv.id}`,
          icon: iconFor("Invoice"),
          score: s,
        });
      }
    }

    for (const p of products) {
      const s = Math.max(score(p.name, q), score(p.sku, q));
      if (s > 0) {
        out.push({
          id: `product-${p.id}`,
          kind: "Product",
          title: p.name,
          subtitle: `${p.sku} · $${p.price.toFixed(2)}`,
          href: `/ops?product=${p.id}`,
          icon: iconFor("Product"),
          score: s,
        });
      }
    }

    for (const o of orders) {
      const s = Math.max(score(o.orderNumber, q), score(o.customerName, q));
      if (s > 0) {
        out.push({
          id: `order-${o.id}`,
          kind: "Order",
          title: o.orderNumber,
          subtitle: `${o.customerName} · $${o.total.toLocaleString()} · ${o.status}`,
          href: `/ops`,
          icon: iconFor("Order"),
          score: s,
        });
      }
    }

    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 24);
  }, [query, projects, tasks, deals, accounts, contacts, invoices, products, orders]);

  /* Group hits by kind for section headers. */
  const sections = useMemo<Array<{ kind: Hit["kind"]; items: Hit[] }>>(() => {
    const order: Hit["kind"][] = [
      "Project",
      "Deal",
      "Account",
      "Contact",
      "Invoice",
      "Product",
      "Order",
    ];
    return order
      .map((kind) => ({
        kind,
        items: hits.filter((h) => h.kind === kind),
      }))
      .filter((s) => s.items.length > 0);
  }, [hits]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  /* Global hotkey — ⌘⇧F / Ctrl+⇧+F */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Focus input when opened; reset on close */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  /* Reset selected index when query changes */
  useEffect(() => {
    setSelected(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[selected]) {
      e.preventDefault();
      go(flat[selected].href);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12,10,30,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 200,
            display: "flex",
            justifyContent: "center",
            paddingTop: "10vh",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-frosted"
            style={{
              width: "100%",
              maxWidth: 640,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "var(--elev-5)",
            }}
          >
            {/* Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                borderBottom: flat.length > 0 || query ? "1px solid var(--content-border)" : "none",
              }}
            >
              <Search size={16} style={{ color: "var(--text-tertiary)" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search projects, deals, contacts, invoices…"
                aria-label="Global search"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 15,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              />
              <kbd
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                }}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            {query.trim() && flat.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                }}
              >
                No results for <strong style={{ color: "var(--text-secondary)" }}>&ldquo;{query}&rdquo;</strong>
              </div>
            )}

            {flat.length > 0 && (
              <div
                className="content-scroll"
                style={{ maxHeight: "60vh", overflow: "auto", padding: "8px 0" }}
              >
                {sections.map((section) => (
                  <div key={section.kind}>
                    <div
                      style={{
                        padding: "8px 16px 4px",
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {section.kind}s · {section.items.length}
                    </div>
                    {section.items.map((hit) => {
                      const flatIdx = flat.indexOf(hit);
                      const active = flatIdx === selected;
                      return (
                        <button
                          type="button"
                          key={hit.id}
                          onClick={() => go(hit.href)}
                          onMouseEnter={() => setSelected(flatIdx)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 16px",
                            border: "none",
                            background: active ? "rgba(108,71,255,0.10)" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            color: "var(--text-primary)",
                            transition: "background 0.08s",
                          }}
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "var(--content-secondary)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {hit.icon}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                letterSpacing: "-0.005em",
                              }}
                            >
                              {hit.title}
                            </div>
                            {hit.subtitle && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--text-tertiary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  marginTop: 1,
                                }}
                              >
                                {hit.subtitle}
                              </div>
                            )}
                          </div>
                          {active && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10.5,
                                color: "var(--text-tertiary)",
                                flexShrink: 0,
                              }}
                            >
                              <CornerDownLeft size={11} />
                              Open
                            </span>
                          )}
                          {!active && (
                            <ArrowRight
                              size={12}
                              style={{ color: "var(--text-tertiary)", flexShrink: 0, opacity: 0.5 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Footer hint when empty */}
            {!query.trim() && (
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  background: "var(--content-secondary)",
                  borderTop: "1px solid var(--content-border)",
                }}
              >
                <span>Search across projects, deals, contacts, invoices, products, and orders.</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <KBD>↑↓</KBD>
                  <span>navigate</span>
                  <KBD>↵</KBD>
                  <span>open</span>
                </span>
              </div>
            )}

            {/* Close button (mouse users) */}
            <button
              type="button"
              aria-label="Close search"
              onClick={close}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                visibility: "hidden",
              }}
            >
              <X size={12} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function KBD({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        padding: "1px 6px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        color: "var(--text-secondary)",
        marginLeft: 4,
      }}
    >
      {children}
    </kbd>
  );
}
