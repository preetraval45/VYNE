import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";

// /api/ai/receipt — extracts vendor / amount / date / category from a
// receipt image data URL using Gemini Vision (free tier). Returns a
// structured JSON object the /expenses/new form can prefill.
//
// Soft-fails when GEMINI_API_KEY is missing — returns 503 with a
// setup hint so the UI can fall back to manual entry.

interface ReceiptBody {
  /** data:image/...;base64,... */
  imageDataUrl: string;
}

interface ReceiptOut {
  vendor: string | null;
  amount: number | null;
  date: string | null; // ISO YYYY-MM-DD
  category: string | null;
  rawText: string | null;
  provider: "gemini" | "fallback";
}

const PROMPT = `You are extracting structured data from a receipt image. Return ONLY a JSON object with these exact keys: vendor (merchant name), amount (final total as a number, no currency symbol), date (ISO YYYY-MM-DD if visible, null otherwise), category (one of: meals, travel, supplies, software, lodging, transport, other), rawText (the full text you read off the receipt). No markdown, no commentary.`;

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "ai-receipt", limit: 20, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OCR disabled. Set GEMINI_API_KEY in Vercel env to enable." },
      { status: 503 },
    );
  }

  let body: ReceiptBody;
  try {
    body = (await req.json()) as ReceiptBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.imageDataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "imageDataUrl required (data: URL)" }, { status: 400 });
  }
  // Strip the data: URL prefix to get the base64 payload + mime.
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(body.imageDataUrl);
  if (!m) {
    return NextResponse.json({ error: "Bad image data URL" }, { status: 400 });
  }
  const mime = m[1];
  const base64 = m[2];
  if (base64.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max ~3 MB base64)" }, { status: 413 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: mime, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Gemini ${res.status}: ${txt.slice(0, 200)}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    let parsed: Partial<ReceiptOut> = {};
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(text.slice(start, end + 1)) as Partial<ReceiptOut>;
      }
    } catch {
      // ignore — return null fields
    }
    return NextResponse.json<ReceiptOut>({
      vendor: parsed.vendor ?? null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      date: typeof parsed.date === "string" ? parsed.date : null,
      category: typeof parsed.category === "string" ? parsed.category : null,
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : null,
      provider: "gemini",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR failed" },
      { status: 500 },
    );
  }
}
