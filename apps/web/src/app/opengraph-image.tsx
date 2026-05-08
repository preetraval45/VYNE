import { ImageResponse } from "next/og";

// Auto-generated Open Graph image (UI_UPGRADE_PLAN.md 9.7).
// Renders at /opengraph-image.png. Next.js automatically wires this
// into <meta property="og:image"> + <meta name="twitter:image"> on
// every route under this layout, replacing the text-only OG metadata
// shipped earlier with a real 1200×630 image.

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "VYNE — AI-native Company OS";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0A1820 0%, #161836 60%, #2D1B69 100%)",
          color: "#F0F4F8",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(108, 71, 255, 0.4) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            left: "-5%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Sparkle mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              background:
                "linear-gradient(135deg, rgb(108, 71, 255), rgb(6, 182, 212))",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            ✦
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            VYNE
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: "880px",
            zIndex: 1,
            marginBottom: "24px",
          }}
        >
          AI-native Company OS
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.75)",
            lineHeight: 1.4,
            maxWidth: "780px",
            zIndex: 1,
          }}
        >
          Replace Slack, Jira, and Notion with one AI-powered workspace.
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            right: "80px",
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.5)",
            letterSpacing: "0.02em",
            display: "flex",
          }}
        >
          vyne.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
