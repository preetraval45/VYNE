import { requireAuth } from "@/lib/api/security";
export const runtime = "edge";

interface EditPayload {
  /** Source image as a data URL (data:image/png;base64,...) */
  imageDataUrl: string;
  /** Instruction describing the edit */
  prompt: string;
}

interface EditResponse {
  imageDataUrl: string | null;
  error?: string;
}

/**
 * Image-to-image editing via Gemini 2.5 Flash Image (a.k.a. Nano
 * Banana). Accepts a source image + text instruction and returns the
 * edited image as a base64 PNG data URL the client can render inline.
 *
 * Uses the v1beta generateContent endpoint with an inline_data part
 * for the source image. Falls back gracefully when the key or model
 * isn't available on the user's plan.
 */
export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  let payload: EditPayload;
  try {
    payload = (await req.json()) as EditPayload;
  } catch {
    return Response.json(
      { imageDataUrl: null, error: "Invalid JSON" } satisfies EditResponse,
      { status: 400 },
    );
  }

  const prompt = (payload.prompt ?? "").trim();
  const src = payload.imageDataUrl ?? "";
  if (!prompt) {
    return Response.json(
      {
        imageDataUrl: null,
        error: "Missing prompt — describe how to edit the image.",
      } satisfies EditResponse,
      { status: 400 },
    );
  }
  if (!src.startsWith("data:image/")) {
    return Response.json(
      {
        imageDataUrl: null,
        error: "Invalid image input.",
      } satisfies EditResponse,
      { status: 400 },
    );
  }

  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!geminiKey) {
    return Response.json(
      {
        imageDataUrl: null,
        error:
          "Image editing requires GEMINI_API_KEY in the deployment env. Free keys at https://aistudio.google.com/apikey.",
      } satisfies EditResponse,
    );
  }

  // Parse the data URL into mime + base64.
  const match = src.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
  if (!match) {
    return Response.json(
      {
        imageDataUrl: null,
        error: "Could not parse image data URL.",
      } satisfies EditResponse,
      { status: 400 },
    );
  }
  const mimeType = match[1];
  const base64 = match[2];

  // Image-editing models — verified IDs Google currently exposes via
  // the v1beta API. Order: best (newest Nano Banana variants) → fallback.
  const candidates = [
    "gemini-3.1-flash-image-preview", // Nano Banana 2
    "gemini-3-pro-image-preview", // Nano Banana Pro
    "gemini-2.5-flash-image", // Nano Banana
    "gemini-2.5-flash-image-preview", // Older preview alias
  ];

  const allErrors: string[] = [];
  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      });

      if (!res.ok) {
        const body = (await res.text().catch(() => res.statusText)).slice(
          0,
          120,
        );
        allErrors.push(`${model} → ${res.status} ${body}`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data?: string; mimeType?: string };
              inline_data?: { data?: string; mime_type?: string };
            }>;
          };
        }>;
      };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p) => p.inlineData?.data || p.inline_data?.data,
      );
      const outData =
        imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
      const outMime =
        imagePart?.inlineData?.mimeType ??
        imagePart?.inline_data?.mime_type ??
        "image/png";
      if (outData) {
        return Response.json({
          imageDataUrl: `data:${outMime};base64,${outData}`,
        } satisfies EditResponse);
      }
      allErrors.push(`${model} → 200 but no image part`);
    } catch (e) {
      allErrors.push(`${model} → ${(e as Error).message}`);
    }
  }

  return Response.json(
    {
      imageDataUrl: null,
      error: `Image editing: every model failed. Tried:\n${allErrors.join("\n")}\n\nVisit /api/ai/list-models to see which models your key has access to.`,
    } satisfies EditResponse,
  );
}
