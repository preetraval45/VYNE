"use client";

/**
 * SkipToContent — an accessible skip-navigation link.
 *
 * Visually hidden by default; becomes visible when focused via keyboard Tab.
 * Links to #main-content so users can jump past the sidebar / top chrome.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content"
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        zIndex: 9999,
        padding: "12px 24px",
        background: "#6C47FF",
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 600,
        borderRadius: "0 0 8px 0",
        textDecoration: "none",
        outline: "2px solid #8B68FF",
        outlineOffset: 2,
        transition: "top 0.1s, left 0.1s",
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = "0";
        e.currentTarget.style.left = "0";
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = "-9999px";
        e.currentTarget.style.left = "-9999px";
      }}
    >
      Skip to main content
    </a>
  );
}
