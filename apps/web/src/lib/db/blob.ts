import { put, del, list, type PutBlobResult } from "@vercel/blob";

export async function uploadBlob(
  key: string,
  body: File | Blob | ArrayBuffer | string,
  opts: { contentType?: string; access?: "public" } = {},
): Promise<PutBlobResult> {
  return put(key, body, {
    access: opts.access ?? "public",
    contentType: opts.contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export async function listBlobs(prefix?: string) {
  return list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN });
}
