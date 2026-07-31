import type { Metadata } from 'next'
import { Cinzel, Geist_Mono, Barlow } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { NotificationStack } from '@/components/notifications/notification-stack'
import './globals.css'

const barlow = Barlow({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-sans', // We map this to font-sans!
})

const cinzel = Cinzel({ 
  subsets: ["latin"],
  variable: '--font-cinzel'
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
})

export const metadata: Metadata = {
  title: 'Corian Character Sheet',
  description: 'Interactive D&D 5e Character Sheet',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${cinzel.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <NotificationStack />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
