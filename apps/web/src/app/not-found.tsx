import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        background: "var(--content-bg)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          background: "var(--aurora-text)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          marginBottom: 16,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          margin: "0 0 32px",
          maxWidth: 420,
          lineHeight: 1.55,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist, has been moved, or is still under construction.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          className="btn-teal"
          style={{ textDecoration: "none" }}
        >
          Back to home
        </Link>
        <Link
          href="/home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 22px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            color: "var(--text-primary)",
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            textDecoration: "none",
          }}
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
