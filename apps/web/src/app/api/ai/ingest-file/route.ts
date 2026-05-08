import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { chunkText } from "@/lib/rag";

// /api/ai/ingest-file (UI_UPGRADE_PLAN.md 5.6)
//
// Multipart variant of /api/ai/ingest that accepts a file blob, extracts
// text server-side (pdf-parse for PDFs; plain string for text/markdown/
// json/csv), then chunks + embeds + upserts into the Embedding table.
//
// Used by the chat composer's drag-and-drop handler so a user can drop a
// PDF, get an "Indexed" toast, and immediately ask questions about its
// contents — the AI sidebar's auto-RAG injection picks up the new chunks
// on the next /api/ai/search call.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap

async function extractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Plain text-y formats — read as UTF-8 directly.
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const isText =
    type.startsWith("text/") ||
    type === "application/json" ||
    type === "application/xml" ||
    type === "application/javascript" ||
    /\.(md|txt|csv|json|xml|js|ts|tsx|jsx|html|css|yaml|yml|log)$/.test(name);
  if (isText) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  // PDF — pdf-parse runs server-side. Lazy-imported so the module
  // doesn't bloat the bundle for non-PDF traffic.
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const mod = await import("pdf-parse").catch(() => null);
    if (!mod?.default) {
      throw new Error("pdf-parse module not available");
    }
    const buf = Buffer.from(bytes);
    const result = (await mod.default(buf)) as { text?: string };
    return (result.text ?? "").trim();
  }

  throw new Error(
    `Unsupported file type: ${type || name.split(".").pop() || "unknown"}. Send PDF, TXT, MD, JSON, CSV, or other text files.`,
  );
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-ingest-file",
    limit: 20,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "expected multipart/form-data" },
      { status: 415 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file field required" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `file too large (${Math.round(file.size / 1024)} KB > ${MAX_BYTES / 1024} KB cap)`,
      },
      { status: 413 },
    );
  }

  // Optional ref override; defaults to a content-derived id.
  const refOverride = form.get("ref");
  const sourceOverride = form.get("source");

  let text: string;
  try {
    text = await extractText(file);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "extract failed" },
      { status: 400 },
    );
  }
  if (!text || text.length < 20) {
    return NextResponse.json(
      {
        error: `extracted ${text.length} characters — too short to ingest. PDF may be image-only (OCR required).`,
      },
      { status: 422 },
    );
  }

  const chunks = chunkText(text).slice(0, 200);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "no chunks produced" },
      { status: 422 },
    );
  }

  const ref =
    typeof refOverride === "string" && refOverride.trim()
      ? refOverride.trim()
      : `file:${file.name.replace(/[^a-z0-9._-]/gi, "_").slice(0, 80)}-${Date.now().toString(36)}`;
  const source =
    typeof sourceOverride === "string" && sourceOverride.trim()
      ? sourceOverride.trim()
      : file.name;

  // Embed each chunk via the existing /api/ai/embed (same fan-out as
  // /api/ai/ingest). Falls through to the local hash vector when no
  // provider key is set, so demo mode still indexes the file.
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  let created = 0;
  let failed = 0;
  for (const chunk of chunks) {
    try {
      const r = await fetch(`${origin}/api/ai/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk }),
      });
      if (!r.ok) {
        failed++;
        continue;
      }
      const j = (await r.json()) as { vector?: number[] };
      if (!Array.isArray(j.vector)) {
        failed++;
        continue;
      }
      await prisma.embedding.create({
        data: {
          ref,
          source,
          text: chunk,
          vector: j.vector as never,
          meta: { fileName: file.name, fileType: file.type, fileSize: file.size } as never,
        },
      });
      created++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    ref,
    source,
    chunkCount: chunks.length,
    created,
    failed,
    fileName: file.name,
    fileSize: file.size,
  });
}
