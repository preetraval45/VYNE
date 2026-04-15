import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'VYNE — AI-native Company OS',
    template: '%s | VYNE',
  },
  description:
    'VYNE is an AI-native Company Operating System that replaces Slack, Jira, and Notion in one unified workspace.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'VYNE — AI-native Company OS',
    description: 'Replace Slack, Jira, and Notion with one AI-powered workspace.',
    url: 'https://vyne.vercel.app',
    siteName: 'VYNE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'VYNE — AI-native Company OS',
    description: 'Replace Slack, Jira, and Notion with one AI-powered workspace.',
  },
  metadataBase: new URL('https://vyne.vercel.app'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
