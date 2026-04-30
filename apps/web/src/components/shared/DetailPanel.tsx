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
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight } from "lucide-react";

/** A slide-in right-side panel for record details.
 *
 *   <DetailPanel
 *     open={selectedId !== null}
 *     onClose={() => setSelectedId(null)}
 *     title="Project name"
 *     subtitle="PRJ · 12 open tasks"
 *     fullPageHref={`/projects/${id}`}
 *   >
 *     <DetailSection>...</DetailSection>
 *   </DetailPanel>
 */
export interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Link to the full-page detail route ("Open full page" icon link). */
  fullPageHref?: string;
  /** Extra controls next to the title — edit, delete, menu, etc. */
  headerActions?: ReactNode;
  /** Tinted badge rendered under the title. */
  badge?: ReactNode;
  children: ReactNode;
  /** Panel width in px. Default: 400 */
  width?: number;
}

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  fullPageHref,
  headerActions,
  badge,
  children,
  width = 400,
}: DetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key closes the panel
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        (target as HTMLInputElement).blur?.();
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to dismiss */}
          <motion.button
            type="button"
            aria-label="Close details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(12, 10, 30, 0.25)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              border: "none",
              cursor: "default",
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label={title}
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="surface-frosted"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width,
              maxWidth: "100vw",
              zIndex: 45,
              display: "flex",
              flexDirection: "column",
              borderRadius: 0,
              borderTop: 0,
              borderRight: 0,
              borderBottom: 0,
              boxShadow: "var(--elev-5)",
            }}
          >
            {/* Header */}
            <header
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--content-border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: subtitle || badge ? 8 : 0,
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.25,
                    marginRight: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {title}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {headerActions}
                  {fullPageHref && (
                    <a
                      href={fullPageHref}
                      title="Open full page"
                      aria-label="Open full page"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "1px solid var(--content-border)",
                        background: "var(--content-bg)",
                        color: "var(--text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "var(--content-secondary)";
                        (e.currentTarget as HTMLAnchorElement).style.color = "var(--vyne-accent, var(--vyne-purple))";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "var(--content-bg)";
                        (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                      }}
                    >
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
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
              </div>
              {subtitle && (
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {subtitle}
                </p>
              )}
              {badge && <div style={{ marginTop: 8 }}>{badge}</div>}
            </header>

            {/* Body */}
            <div
              className="content-scroll"
              style={{
                flex: 1,
                overflow: "auto",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ─── Primitives for panel contents ──────────────────────────────── */

export function DetailSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

export function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "96px 1fr",
        gap: 10,
        alignItems: "baseline",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--text-tertiary)", fontSize: 12, letterSpacing: "-0.005em" }}>
        {label}
      </span>
      <span
        style={{
          color: "var(--text-primary)",
          letterSpacing: "-0.005em",
          fontFamily: mono ? "var(--font-mono)" : undefined,
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Hook: URL-driven open/close via ?detail=<id> ──────────────── */

export function useDetailParam(param = "detail"): {
  id: string | null;
  open: (id: string) => void;
  close: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = searchParams?.get(param) ?? null;

  const open = useCallback(
    (nextId: string) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set(param, nextId);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, param],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete(param);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, param]);

  return useMemo(() => ({ id, open, close }), [id, open, close]);
}
