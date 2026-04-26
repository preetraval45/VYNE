import { NextResponse } from "next/server";
import { requireAuth, rateLimit, requireCsrf } from "@/lib/api/security";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

interface S3PresignResult {
  uploadUrl: string;
  publicUrl: string;
}

async function s3Presign(
  key: string,
  contentType: string,
): Promise<S3PresignResult | null> {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION ?? "us-east-1";
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKey || !secretKey) return null;

  // Defer heavy imports until S3 is actually configured so edge builds stay light.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl };
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response!;

  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const rl = await rateLimit({
    key: "upload-image",
    limit: 30,
    windowSec: 60,
    req: request,
  });
  if (!rl.ok) return rl.response!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 415 },
    );
  }

  // Try S3 first; fall back to inline base64 so demo/local dev still works.
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  const key = `doc-images/${timestamp}-${safeName}`;

  const presigned = await s3Presign(key, file.type).catch(() => null);

  if (presigned) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const putRes = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: buffer,
    });
    if (!putRes.ok) {
      return NextResponse.json({ error: "S3 upload failed" }, { status: 502 });
    }
    return NextResponse.json({ url: presigned.publicUrl, storage: "s3" });
  }

  // Fallback: base64 data URL (demo mode)
  const buffer = Buffer.from(await file.arrayBuffer());
  const b64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${b64}`;
  return NextResponse.json({ url: dataUrl, storage: "inline" });
}
