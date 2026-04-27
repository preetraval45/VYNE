import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#06B6D4",
};

export const metadata: Metadata = {
  title: {
    default: "VYNE — AI-native Company OS",
    template: "%s | VYNE",
  },
  description:
    "VYNE is an AI-native Company Operating System that replaces Slack, Jira, and Notion in one unified workspace.",
  icons: {
    icon: [{ url: "/brand/logo-mark.svg", type: "image/svg+xml" }],
    shortcut: "/brand/logo-mark.svg",
    apple: "/brand/logo-mark.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VYNE",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "VYNE — AI-native Company OS",
    description:
      "Replace Slack, Jira, and Notion with one AI-powered workspace.",
    url: "https://vyne.vercel.app",
    siteName: "VYNE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VYNE — AI-native Company OS",
    description:
      "Replace Slack, Jira, and Notion with one AI-powered workspace.",
  },
  metadataBase: new URL("https://vyne.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
