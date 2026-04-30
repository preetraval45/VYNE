import { requireAuth } from "@/lib/api/security";

export const runtime = "edge";

/**
 * Diagnostic endpoint — lists every Gemini model the user's API key
 * has access to. Used for debugging "model not found" image-gen errors.
 * Restricted to authenticated users (was previously public — could leak
 * the key's available model list to anyone).
 */
export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;
  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!geminiKey) {
    return Response.json({
      ok: false,
      error: "GEMINI_API_KEY env var is not set on this deployment.",
    });
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      return Response.json({
        ok: false,
        status: res.status,
        error: body.slice(0, 600),
      });
    }
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const all = data.models ?? [];
    return Response.json({
      ok: true,
      total: all.length,
      // Only models that work with the same call shape we use for image gen.
      generateContent: all
        .filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => ({
          name: m.name?.replace(/^models\//, ""),
          displayName: m.displayName,
        })),
      // Image-specific predict-style models (Imagen)
      predict: all
        .filter((m) => m.supportedGenerationMethods?.includes("predict"))
        .map((m) => ({
          name: m.name?.replace(/^models\//, ""),
          displayName: m.displayName,
        })),
      raw: all.map((m) => ({
        name: m.name?.replace(/^models\//, ""),
        methods: m.supportedGenerationMethods,
      })),
    });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message });
  }
}
