import { requireAuth } from "@/lib/api/security";
export const runtime = "edge";

interface ImagePayload {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

function arDescription(ar: string): string {
  switch (ar) {
    case "16:9":
      return "wide cinematic landscape format";
    case "9:16":
      return "tall vertical portrait / phone format";
    case "4:3":
      return "classic landscape";
    case "3:4":
      return "classic portrait";
    default:
      return "square";
  }
}

interface ImageResponse {
  imageDataUrl: string | null;
  error?: string;
}

/**
 * Image generation endpoint. Takes a prompt and returns a base64 PNG
 * data URL the client can render directly.
 *
 * Uses Google Imagen 3 via the v1beta API on a Gemini key. Gracefully
 * returns an explanation when the key is missing or the model isn't
 * available on the user's plan.
 */
export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  let payload: ImagePayload;
  try {
    payload = (await req.json()) as ImagePayload;
  } catch {
    return Response.json(
      { imageDataUrl: null, error: "Invalid JSON" } satisfies ImageResponse,
      { status: 400 },
    );
  }

  const prompt = (payload.prompt ?? "").trim();
  if (!prompt) {
    return Response.json(
      { imageDataUrl: null, error: "Missing prompt" } satisfies ImageResponse,
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
          "Image generation requires GEMINI_API_KEY in the deployment env. Free keys at https://aistudio.google.com/apikey.",
      } satisfies ImageResponse,
      { status: 200 },
    );
  }

  // Image-generation models — verified IDs Google currently exposes via
  // the v1beta API. Order: best (newest Nano Banana variants) → fallback.
  const allErrors: string[] = [];
  const flashCandidates = [
    "gemini-3.1-flash-image-preview", // Nano Banana 2
    "gemini-3-pro-image-preview", // Nano Banana Pro
    "gemini-2.5-flash-image", // Nano Banana
    "gemini-2.5-flash-image-preview", // Older preview alias
  ];
  // Aspect-ratio hint baked into the prompt — Flash Image doesn't have
  // a native parameter for this, so we steer the model in plain text.
  const arHint =
    payload.aspectRatio && payload.aspectRatio !== "1:1"
      ? `\n\nIMPORTANT: produce the image in ${payload.aspectRatio} aspect ratio (${arDescription(payload.aspectRatio)}).`
      : "";
  const finalPrompt = prompt + arHint;

  for (const model of flashCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
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
      const imgPart = parts.find(
        (p) => p.inlineData?.data || p.inline_data?.data,
      );
      const outData =
        imgPart?.inlineData?.data ?? imgPart?.inline_data?.data;
      const outMime =
        imgPart?.inlineData?.mimeType ??
        imgPart?.inline_data?.mime_type ??
        "image/png";
      if (outData) {
        return Response.json({
          imageDataUrl: `data:${outMime};base64,${outData}`,
        } satisfies ImageResponse);
      }
      allErrors.push(`${model} → 200 but no image part`);
    } catch (e) {
      allErrors.push(`${model} → ${(e as Error).message}`);
    }
  }

  return Response.json(
    {
      imageDataUrl: null,
      error: `Image generation: every model failed. Tried:\n${allErrors.join("\n")}\n\nVisit /api/ai/list-models to see which models your key has access to.`,
    } satisfies ImageResponse,
  );
}
