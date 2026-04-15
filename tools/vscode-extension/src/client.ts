import * as vscode from "vscode";

export interface DocHit {
  id: string;
  module: string;
  title: string;
  snippet: string;
  href?: string;
}

export interface AiAnswer {
  answer: string;
  reasoningSteps?: string[];
}

export class VyneClient {
  constructor(private readonly ctx: vscode.ExtensionContext) {}

  private async getKey(): Promise<string | undefined> {
    const fromSecrets = await this.ctx.secrets.get("vyne.apiKey");
    if (fromSecrets) return fromSecrets;
    const fromConfig = vscode.workspace.getConfiguration("vyne").get<string>("apiKey");
    return fromConfig?.trim() || undefined;
  }

  private apiUrl(): string {
    return (
      vscode.workspace.getConfiguration("vyne").get<string>("apiUrl") ??
      "https://api.vyne.dev/v1"
    );
  }

  private async fetchJson<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const key = await this.getKey();
    if (!key) {
      throw new Error("VYNE: not signed in. Run `VYNE: Sign in`.");
    }
    const res = await fetch(`${this.apiUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "vyne-vscode/0.1.0",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async searchDocs(query: string): Promise<DocHit[]> {
    const data = await this.fetchJson<{ hits?: DocHit[] }>("POST", "/ai/search", {
      query,
    });
    return data.hits ?? [];
  }

  async askAi(question: string, context?: string): Promise<AiAnswer> {
    return this.fetchJson<AiAnswer>("POST", "/ai/query", {
      question,
      context,
    });
  }

  async suggestCommit(diff: string): Promise<string> {
    const data = await this.fetchJson<{ suggestion?: string }>(
      "POST",
      "/ai/commit-message",
      { diff },
    );
    return data.suggestion ?? "";
  }
}
