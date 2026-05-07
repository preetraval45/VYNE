"use client";

import { useEffect, useState } from "react";

/**
 * Announcer — single global ARIA live-region that any module can post
 * messages to. Ensures every async action / toast surfaces to screen
 * reader users without forcing every caller to embed their own
 * `role="status"` element.
 *
 * Listens for `vyne:announce` CustomEvents:
 *
 *   announce("Saved", "polite");
 *   announce("Connection lost", "assertive");
 *
 * The component renders two visually-hidden regions (one polite,
 * one assertive) so the politeness level is honoured without re-
 * mounting on every message.
 *
 * Mount once in the dashboard layout.
 */

type Politeness = "polite" | "assertive";

interface Pending {
  id: number;
  text: string;
  level: Politeness;
}

let nextId = 1;

export function Announcer() {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  useEffect(() => {
    function onAnnounce(e: Event) {
      const ce = e as CustomEvent<Pending>;
      const { text, level } = ce.detail;
      if (level === "assertive") setAssertive(text);
      else setPolite(text);
      // Clear after 3 s so back-to-back identical messages still fire.
      window.setTimeout(() => {
        if (level === "assertive") setAssertive((cur) => (cur === text ? "" : cur));
        else setPolite((cur) => (cur === text ? "" : cur));
      }, 3000);
    }
    window.addEventListener("vyne:announce", onAnnounce as EventListener);
    return () =>
      window.removeEventListener("vyne:announce", onAnnounce as EventListener);
  }, []);

  return (
    <>
      <div
        aria-live="polite"
        role="status"
        aria-atomic="true"
        style={visuallyHidden}
      >
        {polite}
      </div>
      <div
        aria-live="assertive"
        role="alert"
        aria-atomic="true"
        style={visuallyHidden}
      >
        {assertive}
      </div>
    </>
  );
}

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Module-level helper for non-React code (toasts, store handlers). */
export function announce(text: string, level: Politeness = "polite") {
  if (typeof window === "undefined") return;
  if (!text) return;
  window.dispatchEvent(
    new CustomEvent("vyne:announce", {
      detail: { id: nextId++, text, level },
    }),
  );
}
