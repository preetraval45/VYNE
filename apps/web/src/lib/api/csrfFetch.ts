// CSRF-aware fetch wrapper for state-changing requests.
//
// The double-submit pattern: the server set a `vyne-csrf` cookie when
// the session was issued. JS reads that cookie and sends its value back
// in the `X-CSRF-Token` header. The server's `requireCsrf` confirms the
// header matches the cookie. A cross-site attacker cannot read the
// cookie (same-origin policy) so they cannot forge the header.
//
// GET/HEAD/OPTIONS skip CSRF — they're safe by HTTP semantics.

function readCsrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|;\s*)vyne-csrf=([^;]+)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isUnsafe =
    method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  const headers = new Headers(init.headers ?? {});
  if (isUnsafe) {
    const token = readCsrfFromCookie();
    if (token) headers.set("X-CSRF-Token", token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
  });
}
