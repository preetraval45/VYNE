"use client";

import { useEffect, useState } from "react";

/**
 * Returns true after the component has mounted on the client.
 *
 * Use this to gate any UI that depends on browser-only state
 * (localStorage, window, navigator, persisted Zustand stores) so the
 * server-rendered HTML matches the client's first render. After mount,
 * the value flips to true and a re-render shows the real data.
 *
 * Without this guard, persist-backed stores produce different output
 * on server (initial state) vs client first render (localStorage values),
 * which triggers React hydration error #418.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
