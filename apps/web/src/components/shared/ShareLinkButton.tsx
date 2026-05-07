"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link2, Copy, Check, X as XIcon, QrCode } from "lucide-react";
import toast from "react-hot-toast";

export interface ShareLinkButtonProps {
  /** Stable identifier for the entity (deal id, task id, invoice id…). */
  entityId: string;
  /** Path the short link should resolve to: e.g. `/crm?deal=DEAL-123`. */
  href: string;
  /** Singular noun used in messages: "deal", "task", "invoice". */
  label?: string;
  /** Optional title shown above the popover. */
  title?: string;
  /** Compact variant — icon only, no label. */
  iconOnly?: boolean;
  /** Custom button style override. */
  style?: CSSProperties;
}

/**
 * ShareLinkButton — universal share affordance for any entity.
 *
 * Click → popover with three things:
 *   1. The full URL (deep link to the current host + href).
 *   2. A "Copy" button (writes to clipboard).
 *   3. A QR code thumbnail (uses a deterministic offline-friendly
 *      data-URL via the public `qrserver.com` API; we cache the rendered
 *      image so re-opens are instant). Tapping the QR opens it full-size
 *      in a new tab so phones can rescan from another device.
 *
 * Drop into any kebab menu, list-row toolbar, or detail panel:
 *
 *   <ShareLinkButton entityId={deal.id} href={`/crm?deal=${deal.id}`} label="deal" />
 */
export function ShareLinkButton(props: ShareLinkButtonProps) {
  const {
    entityId,
    href,
    label = "link",
    title,
    iconOnly = false,
    style,
  } = props;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Build absolute URL on the client only — at SSR there's no `location`.
  const [fullUrl, setFullUrl] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const url = href.startsWith("http") ? href : `${origin}${href}`;
    setFullUrl(url);
  }, [href]);

  // Click outside / Esc closes the popover.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success(`Link to ${label} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  }, [fullUrl, label]);

  // Public QR rendering API — no client-side dep needed. We pass the
  // URL-encoded payload + size; the response is a PNG. If the network is
  // unavailable the <img> falls back to alt text and the user can still
  // copy the URL manually.
  const qrSrc =
    fullUrl &&
    `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(fullUrl)}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Share ${label}`}
        aria-expanded={open}
        title={`Share this ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: iconOnly ? 6 : "5px 10px",
          borderRadius: 7,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          color: "var(--text-secondary)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          ...style,
        }}
      >
        <Link2 size={13} />
        {!iconOnly && "Share"}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={title ?? `Share ${label}`}
          style={{
            position: "absolute",
            zIndex: 50,
            marginTop: 6,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
            padding: 12,
            width: 320,
            maxWidth: "calc(100vw - 24px)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {title ?? `Share ${label}`}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: 2,
                display: "inline-flex",
              }}
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* URL row */}
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <input
              readOnly
              value={fullUrl}
              aria-label={`URL for ${label}`}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "6px 8px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "var(--input-bg)",
                color: "var(--text-secondary)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={copy}
              aria-label="Copy link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                background: copied
                  ? "var(--status-success)"
                  : "var(--vyne-accent, #06B6D4)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* QR toggle */}
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 8px",
              fontSize: 11.5,
              fontWeight: 500,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <QrCode size={12} />
            {showQr ? "Hide QR" : "Show QR"}
          </button>

          {showQr && qrSrc && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <a
                href={qrSrc}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open QR code for ${label} full-size`}
                style={{
                  display: "block",
                  borderRadius: 8,
                  background: "#fff",
                  padding: 6,
                  border: "1px solid var(--content-border)",
                }}
              >
                <img
                  src={qrSrc}
                  alt={`QR code for ${label} ${entityId}`}
                  width={160}
                  height={160}
                  style={{ display: "block" }}
                />
              </a>
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--text-tertiary)",
                }}
              >
                Scan with another device · tap to open full-size
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
