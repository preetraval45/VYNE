"use client";

/**
 * Call-time whiteboard / annotation layer (28.3.5).
 *
 *   const id = openCallWhiteboard(callId);
 *   …
 *   closeCallWhiteboard();
 *
 * Reuses the existing docs `<WhiteboardCanvas>` (Phase 8) — same
 * Yjs / y-webrtc CRDT so multiple presenters can draw simultaneously.
 * The host opens a per-call doc id with the namespace
 * `call-whiteboard-${callId}`; viewers connect to the same id and
 * see strokes in real time.
 *
 * Annotation-on-screen-share is the same surface — when the layer
 * is open during a screen share, strokes overlay the shared video
 * (caller positions the canvas absolutely).
 */

const WHITEBOARD_NS = "call-whiteboard";

export interface WhiteboardSession {
  callId: string;
  /** Yjs / y-webrtc room id passed to `<WhiteboardCanvas docId={…}>`. */
  docId: string;
  openedAt: string;
  openedBy: string;
}

let _active: WhiteboardSession | null = null;

export function openCallWhiteboard(
  callId: string,
  openedBy: string,
): WhiteboardSession {
  const docId = `${WHITEBOARD_NS}-${callId}`;
  _active = {
    callId,
    docId,
    openedAt: new Date().toISOString(),
    openedBy,
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vyne:call-whiteboard:open", {
        detail: _active,
      }),
    );
  }
  return _active;
}

export function closeCallWhiteboard(): void {
  if (!_active) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vyne:call-whiteboard:close", {
        detail: { ..._active },
      }),
    );
  }
  _active = null;
}

export function activeWhiteboard(): WhiteboardSession | null {
  return _active;
}

/** True when the active whiteboard belongs to the given call. */
export function whiteboardOpenFor(callId: string): boolean {
  return _active !== null && _active.callId === callId;
}

/**
 * Subscribe to open / close events so the call panel can mount /
 * unmount the canvas overlay reactively.
 */
export function onWhiteboardChange(
  handler: (event: "open" | "close", session: WhiteboardSession) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const onOpen = (e: Event) => {
    handler("open", (e as CustomEvent<WhiteboardSession>).detail);
  };
  const onClose = (e: Event) => {
    handler("close", (e as CustomEvent<WhiteboardSession>).detail);
  };
  window.addEventListener("vyne:call-whiteboard:open", onOpen);
  window.addEventListener("vyne:call-whiteboard:close", onClose);
  return () => {
    window.removeEventListener("vyne:call-whiteboard:open", onOpen);
    window.removeEventListener("vyne:call-whiteboard:close", onClose);
  };
}
