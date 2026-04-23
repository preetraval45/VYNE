"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useCreateProject } from "@/hooks/useProjects";
import { cn, generateIdentifier } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";
import toast from "react-hot-toast";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const createProject = useCreateProject();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    identifier: "",
    description: "",
    color: PROJECT_COLORS[0],
    icon: "📋",
  });

  const [identifierEdited, setIdentifierEdited] = useState(false);

  // Auto-generate identifier from name
  useEffect(() => {
    if (!identifierEdited && form.name) {
      setForm((prev) => ({
        ...prev,
        identifier: generateIdentifier(form.name),
      }));
    }
  }, [form.name, identifierEdited]);

  // Reset on open + auto-focus first input
  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        identifier: "",
        description: "",
        color: PROJECT_COLORS[0],
        icon: "📋",
      });
      setIdentifierEdited(false);
      // Auto-focus the name field after the animation settles
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          firstInputRef.current?.focus();
        });
      });
    }
  }, [open]);

  // Trap focus within the modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap to last element if on first
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap to first element if on last
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      await createProject.mutateAsync({
        name: form.name.trim(),
        identifier:
          form.identifier.trim().toUpperCase() || generateIdentifier(form.name),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
      });
      toast.success(`Project "${form.name}" created!`);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create project";
      toast.error(msg);
    }
  }

  const inputClass = cn(
    "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150",
    "placeholder:text-[#C0C0D8]",
  );

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content asChild onEscapeKeyDown={onClose}>
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[500px] rounded-2xl"
                style={{
                  background: "var(--content-bg)",
                  boxShadow:
                    "0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-project-title"
                aria-describedby="create-project-desc"
                onKeyDown={handleKeyDown}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: "1px solid var(--content-border)" }}
                >
                  <div>
                    <Dialog.Title
                      id="create-project-title"
                      className="text-base font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      New Project
                    </Dialog.Title>
                    <p
                      id="create-project-desc"
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Set up a new project for your team
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                      aria-label="Close dialog"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "#F8F8FC";
                        (e.currentTarget as HTMLElement).style.color =
                          "#1A1A2E";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.color =
                          "#A0A0B8";
                      }}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {/* Name */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor="project-name"
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Project name *
                      </label>
                      <input
                        id="project-name"
                        ref={firstInputRef}
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. Product Redesign"
                        required
                        autoFocus
                        className={inputClass}
                        style={{
                          background: "var(--content-secondary)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "1px solid #06B6D4";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(6, 182, 212,0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E8E8F0";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* Identifier */}
                  <div>
                    <label
                      htmlFor="project-identifier"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Identifier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="project-identifier"
                        type="text"
                        value={form.identifier}
                        onChange={(e) => {
                          setIdentifierEdited(true);
                          setForm((f) => ({
                            ...f,
                            identifier: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 6),
                          }));
                        }}
                        placeholder="AUTO"
                        maxLength={6}
                        className={cn(inputClass, "font-mono w-24 text-center")}
                        style={{
                          background: "var(--content-secondary)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => {
                          e.target.style.border = "1px solid #06B6D4";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(6, 182, 212,0.08)";
                        }}
                        onBlur={(e) => {
                          e.target.style.border = "1px solid #E8E8F0";
                          e.target.style.boxShadow = "none";
                        }}
                        aria-describedby="identifier-hint"
                      />
                      <p
                        id="identifier-hint"
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Issues will be labeled {form.identifier || "PROJ"}-1,{" "}
                        {form.identifier || "PROJ"}-2…
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="project-description"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Description
                    </label>
                    <textarea
                      id="project-description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="What is this project about?"
                      rows={3}
                      className={cn(inputClass, "resize-none")}
                      style={{
                        background: "var(--content-secondary)",
                        border: "1px solid var(--content-border)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid #06B6D4";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(6, 182, 212,0.08)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid #E8E8F0";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Color */}
                  <fieldset>
                    <legend
                      className="block text-xs font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Color
                    </legend>
                    <div
                      className="flex gap-2.5 flex-wrap"
                      role="radiogroup"
                      aria-label="Project color"
                    >
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          role="radio"
                          aria-checked={form.color === color}
                          aria-label={`Color ${color}`}
                          onClick={() => setForm((f) => ({ ...f, color }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: color,
                            transform:
                              form.color === color ? "scale(1.2)" : "scale(1)",
                            boxShadow:
                              form.color === color
                                ? `0 0 0 2px white, 0 0 0 4px ${color}`
                                : "none",
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </fieldset>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2"
                    style={{ borderTop: "1px solid #F0F0F8" }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: "var(--content-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--content-border)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.name.trim() || createProject.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background:
                          "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
                        boxShadow: "0 2px 8px rgba(6, 182, 212,0.3)",
                      }}
                    >
                      {createProject.isPending ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                          Creating…
                        </>
                      ) : (
                        "Create project"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
