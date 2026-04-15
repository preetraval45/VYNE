import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  client = new Redis({ url, token });
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  return (await r.get<T>(key)) ?? null;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(key, value, { ex: ttlSeconds });
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key);
}
