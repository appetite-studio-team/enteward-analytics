import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Enteward Analytics Dashboard',
  description: 'Real-time database statistics for Appwrite',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}




