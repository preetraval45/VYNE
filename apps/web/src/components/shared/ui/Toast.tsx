"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title?: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id">) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconFor: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const colorFor: Record<ToastKind, { bg: string; fg: string; border: string }> = {
  success: {
    bg: "var(--badge-success-bg)",
    fg: "var(--status-success)",
    border: "rgba(34,197,94,0.3)",
  },
  error: {
    bg: "var(--badge-danger-bg)",
    fg: "var(--status-danger)",
    border: "rgba(239,68,68,0.3)",
  },
  info: {
    bg: "var(--badge-info-bg)",
    fg: "var(--status-info)",
    border: "rgba(99,102,241,0.3)",
  },
  warning: {
    bg: "var(--badge-warning-bg)",
    fg: "var(--status-warning)",
    border: "rgba(245,158,11,0.3)",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = t.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...t, id }]);
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push({ kind: "success", title, description }),
      error:   (title, description) => push({ kind: "error",   title, description }),
      info:    (title, description) => push({ kind: "info",    title, description }),
      warning: (title, description) => push({ kind: "warning", title, description }),
      dismiss,
    }),
    [push, dismiss],
  );

  useEffect(() => {
    const copy = timers.current;
    return () => {
      copy.forEach((h) => window.clearTimeout(h));
      copy.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed bottom-5 right-5 flex flex-col gap-2 pointer-events-none"
            style={{ zIndex: 60, maxWidth: "calc(100vw - 40px)" }}
            role="region"
            aria-label="Notifications"
          >
            <AnimatePresence initial={false}>
              {toasts.map((t) => {
                const Icon = iconFor[t.kind];
                const color = colorFor[t.kind];
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 80, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    role="status"
                    aria-live="polite"
                    className="pointer-events-auto rounded-xl px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[380px]"
                    style={{
                      background: "var(--content-bg)",
                      border: `1px solid ${color.border}`,
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: color.bg, color: color.fg }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {t.title && (
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {t.title}
                        </p>
                      )}
                      {t.description && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {t.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(t.id)}
                      aria-label="Dismiss notification"
                      className="flex-shrink-0 p-1 rounded-md hover:bg-[var(--content-secondary)]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
