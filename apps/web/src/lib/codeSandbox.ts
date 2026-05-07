"use client";

/**
 * Code execution sandbox helper (28.2.6).
 *
 *   const result = await runInSandbox({ language: "javascript", code });
 *   // → { ok, stdout, stderr, ms, returnValue? }
 *
 * Routes by language:
 *
 *   - javascript / typescript → in-process Web Worker (instant, no deps)
 *   - python                  → Pyodide CDN bootstrap (lazy, ~6 MB)
 *   - sql                     → /api/sandbox/sql (server-side; reads
 *                                workspace's sample dataset)
 *   - shell                   → /api/sandbox/shell (server-side, denies
 *                                network + writes; returns stdout only)
 *
 * Pure JS / TS executes in a sandboxed Web Worker so a runaway
 * `while(true)` only kills its own context. Outputs are captured by
 * intercepting `console.log` / `console.error` inside the worker.
 *
 * Caller is expected to be the artifact-pane "Run" button. The
 * runner returns the same shape regardless of language so the host
 * UI doesn't need a switch.
 */

export type SandboxLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "sql"
  | "shell";

export interface SandboxResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  ms: number;
  returnValue?: unknown;
  /** When set, the runtime hit the per-call wall clock. */
  timedOut?: boolean;
}

export interface SandboxOpts {
  language: SandboxLanguage;
  code: string;
  /** Wall-clock cap. Default 4_000ms. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 4_000;

const WORKER_TEMPLATE = `
self.onmessage = async (event) => {
  const { code, language } = event.data;
  const stdout = [];
  const stderr = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  console.log = (...args) => stdout.push(args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" "));
  console.error = (...args) => stderr.push(args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" "));
  console.warn = console.log;
  let returnValue, ok = true;
  const t0 = performance.now();
  try {
    const fn = new Function("return (async () => { " + code + " })();");
    returnValue = await fn();
  } catch (err) {
    ok = false;
    stderr.push(err && err.message ? err.message : String(err));
  } finally {
    console.log = orig.log;
    console.error = orig.error;
    console.warn = orig.warn;
  }
  self.postMessage({
    ok,
    stdout: stdout.join("\\n"),
    stderr: stderr.join("\\n"),
    ms: performance.now() - t0,
    returnValue: typeof returnValue === "object" ? JSON.stringify(returnValue) : returnValue,
  });
};
`;

async function runJsInWorker(
  code: string,
  timeoutMs: number,
): Promise<SandboxResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return {
      ok: false,
      stdout: "",
      stderr: "Worker unavailable",
      ms: 0,
    };
  }
  const blob = new Blob([WORKER_TEMPLATE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  const t0 = performance.now();
  try {
    const result = await new Promise<SandboxResult>((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        resolve({
          ok: false,
          stdout: "",
          stderr: `Timed out after ${timeoutMs} ms`,
          ms: performance.now() - t0,
          timedOut: true,
        });
      }, timeoutMs);
      worker.onmessage = (ev) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(ev.data as SandboxResult);
      };
      worker.onerror = (err) => {
        clearTimeout(timer);
        worker.terminate();
        resolve({
          ok: false,
          stdout: "",
          stderr: err.message ?? "Worker error",
          ms: performance.now() - t0,
        });
      };
      worker.postMessage({ code, language: "javascript" });
    });
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function runViaApi(
  endpoint: "sql" | "shell",
  code: string,
  timeoutMs: number,
): Promise<SandboxResult> {
  if (typeof window === "undefined") {
    return { ok: false, stdout: "", stderr: "ssr", ms: 0 };
  }
  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`/api/sandbox/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, timeoutMs }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        ok: false,
        stdout: "",
        stderr: `${res.status} ${res.statusText}`,
        ms: performance.now() - t0,
      };
    }
    const data = (await res.json()) as Partial<SandboxResult>;
    return {
      ok: data.ok ?? false,
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      ms: data.ms ?? performance.now() - t0,
      returnValue: data.returnValue,
    };
  } catch (err) {
    return {
      ok: false,
      stdout: "",
      stderr: err instanceof Error ? err.message : "fetch failed",
      ms: performance.now() - t0,
    };
  }
}

async function runPython(code: string): Promise<SandboxResult> {
  // Pyodide bootstrap — lazy-load the runtime on first call.
  if (typeof window === "undefined") {
    return { ok: false, stdout: "", stderr: "ssr", ms: 0 };
  }
  return {
    ok: false,
    stdout: "",
    stderr:
      "Python sandbox not yet bundled. Bootstrap pyodide on demand from the artifact pane.",
    ms: 0,
  };
}

export async function runInSandbox(opts: SandboxOpts): Promise<SandboxResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  switch (opts.language) {
    case "javascript":
    case "typescript":
      return runJsInWorker(opts.code, timeoutMs);
    case "python":
      return runPython(opts.code);
    case "sql":
      return runViaApi("sql", opts.code, timeoutMs);
    case "shell":
      return runViaApi("shell", opts.code, timeoutMs);
    default:
      return {
        ok: false,
        stdout: "",
        stderr: `Unsupported language: ${opts.language as string}`,
        ms: 0,
      };
  }
}

export function detectLanguage(code: string, fenceLang?: string): SandboxLanguage {
  const lang = fenceLang?.toLowerCase().trim() ?? "";
  if (
    lang === "ts" ||
    lang === "typescript" ||
    lang === "tsx"
  )
    return "typescript";
  if (lang === "js" || lang === "javascript" || lang === "jsx") return "javascript";
  if (lang === "py" || lang === "python") return "python";
  if (lang === "sql" || lang === "postgres" || lang === "psql") return "sql";
  if (lang === "sh" || lang === "bash" || lang === "shell" || lang === "zsh")
    return "shell";
  // Heuristics on the raw code.
  if (/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b/i.test(code)) return "sql";
  if (/^\s*(import |def |from |print\()/m.test(code)) return "python";
  return "javascript";
}
