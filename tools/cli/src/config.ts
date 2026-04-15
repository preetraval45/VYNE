import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface CliConfig {
  apiUrl: string;
  apiKey?: string;
  user?: { id: string; name: string; email: string };
}

const CONFIG_PATH = join(homedir(), ".vyne", "config.json");

const DEFAULTS: CliConfig = {
  apiUrl: process.env.VYNE_API_URL ?? "https://api.vyne.dev/v1",
};

export async function loadConfig(): Promise<CliConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CliConfig>) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveConfig(patch: Partial<CliConfig>): Promise<CliConfig> {
  const current = await loadConfig();
  const next = { ...current, ...patch };
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function requireKey(): Promise<{ apiUrl: string; apiKey: string }> {
  const cfg = await loadConfig();
  if (!cfg.apiKey) {
    throw new Error(
      "Not authenticated. Run `vyne login` or set VYNE_API_KEY in your env.",
    );
  }
  return { apiUrl: cfg.apiUrl, apiKey: cfg.apiKey };
}

export async function api<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const { apiUrl, apiKey } = await requireKey();
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "vyne-cli/0.1.0",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}
