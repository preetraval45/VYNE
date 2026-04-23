// Shims for optional runtime dependencies not installed in demo-mode builds.
// These modules are only imported behind IS_DEMO_MODE gates, so their
// implementations are never executed on the marketing/demo deployment.

declare module "@vercel/blob" {
  export interface PutBlobResult {
    url: string;
    pathname: string;
    contentType: string;
    contentDisposition: string;
  }
  export function put(path: string, body: unknown, opts?: unknown): Promise<PutBlobResult>;
  export function del(url: string | string[], opts?: unknown): Promise<void>;
  export function list(opts?: unknown): Promise<{ blobs: Array<{ url: string; pathname: string; size: number }> }>;
  export function head(url: string): Promise<{ url: string; pathname: string; size: number } | null>;
}

declare module "@vercel/postgres" {
  export function sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
  export function createClient(opts?: unknown): {
    connect: () => Promise<void>;
    query: <T = Record<string, unknown>>(q: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
    end: () => Promise<void>;
  };
}

declare module "@upstash/redis" {
  export class Redis {
    constructor(opts: { url: string; token: string });
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, opts?: { ex?: number }): Promise<string>;
    del(key: string | string[]): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
  }
}
