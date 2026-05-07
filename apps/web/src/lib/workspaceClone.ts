"use client";

/**
 * Cross-workspace clone helper (26.6).
 *
 *   const result = await cloneWorkspaceConfig({
 *     fromSlug: "acme",
 *     toSlug: "acme-staging",
 *     pieces: ["theme", "automations", "templates", "shortcuts", "savedViews"],
 *   });
 *
 * Each piece reads + writes a known `vyne-*` localStorage namespace
 * (or zustand store hydration target). The function returns a
 * per-piece success summary so the UI can show "✓ theme · ✓ shortcuts
 * · ✗ automations (couldn't read)".
 *
 * Demo: same browser, two slug-prefixed namespaces. Production swaps
 * the localStorage reads for `/api/workspaces/{slug}/{piece}` calls
 * served by the canonical DB.
 */

export type ClonePiece =
  | "theme"
  | "automations"
  | "templates"
  | "shortcuts"
  | "savedViews"
  | "ai-prefs"
  | "personalization"
  | "notifications";

const PIECE_KEYS: Record<ClonePiece, string[]> = {
  theme: ["vyne-theme"],
  automations: ["vyne-workflows"],
  templates: ["vyne-record-templates", "vyne-report-templates"],
  shortcuts: ["vyne-keyboard-shortcuts"],
  savedViews: [
    "vyne-saved-views",
    "vyne-saved-searches",
  ],
  "ai-prefs": ["vyne-ai-workspace", "vyne-ai-schedules"],
  personalization: ["vyne-personalization"],
  notifications: ["vyne-notification-center", "vyne-settings"],
};

export interface CloneOpts {
  fromSlug: string;
  toSlug: string;
  pieces: ClonePiece[];
  /** Overwrite vs merge. Default merge (`patch` semantics). */
  mode?: "overwrite" | "merge";
}

export interface CloneOutcome {
  piece: ClonePiece;
  ok: boolean;
  copiedKeys: number;
  reason?: string;
}

function nsKey(slug: string, key: string): string {
  // Browser-side simulation: prefix the key with the workspace slug so
  // the same browser can hold multiple workspaces' state side-by-side.
  return `ws::${slug}::${key}`;
}

function readKey(slug: string, key: string): string | null {
  if (typeof window === "undefined") return null;
  // Try slug-namespaced key first; fall back to the bare key when the
  // user is currently on the source workspace (no namespace yet).
  return (
    localStorage.getItem(nsKey(slug, key)) ??
    localStorage.getItem(key)
  );
}

function writeKey(slug: string, key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(nsKey(slug, key), value);
}

function mergeJson(prev: string | null, next: string): string {
  if (!prev) return next;
  try {
    const a = JSON.parse(prev);
    const b = JSON.parse(next);
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify([...a, ...b]);
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      return JSON.stringify({ ...a, ...b });
    }
    return next;
  } catch {
    return next;
  }
}

export async function cloneWorkspaceConfig(opts: CloneOpts): Promise<{
  ok: boolean;
  outcomes: CloneOutcome[];
}> {
  const { fromSlug, toSlug, pieces } = opts;
  const mode = opts.mode ?? "merge";
  if (typeof window === "undefined") {
    return {
      ok: false,
      outcomes: pieces.map((p) => ({
        piece: p,
        ok: false,
        copiedKeys: 0,
        reason: "ssr",
      })),
    };
  }
  if (fromSlug === toSlug) {
    return {
      ok: false,
      outcomes: pieces.map((p) => ({
        piece: p,
        ok: false,
        copiedKeys: 0,
        reason: "same workspace",
      })),
    };
  }

  const outcomes: CloneOutcome[] = [];
  for (const piece of pieces) {
    const keys = PIECE_KEYS[piece];
    if (!keys || keys.length === 0) {
      outcomes.push({ piece, ok: false, copiedKeys: 0, reason: "unknown piece" });
      continue;
    }
    let copied = 0;
    let lastReason: string | undefined;
    for (const key of keys) {
      const value = readKey(fromSlug, key);
      if (!value) {
        lastReason = "no source data";
        continue;
      }
      try {
        const next =
          mode === "overwrite"
            ? value
            : mergeJson(localStorage.getItem(nsKey(toSlug, key)), value);
        writeKey(toSlug, key, next);
        copied += 1;
      } catch {
        lastReason = "write failed";
      }
    }
    outcomes.push({
      piece,
      ok: copied > 0,
      copiedKeys: copied,
      reason: copied === 0 ? lastReason : undefined,
    });
  }
  return {
    ok: outcomes.some((o) => o.ok),
    outcomes,
  };
}
