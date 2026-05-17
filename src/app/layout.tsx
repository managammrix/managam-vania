import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://managamvania.mrix.ai'),
  title: 'Managam & Vania — 20.06.2026',
  description: 'Undangan Pernikahan Managam Raja Silalahi & Vania — 20 Juni 2026. #BuildingMANAGAMVANturesWithGod',
  openGraph: {
    title: 'Managam & Vania — 20.06.2026',
    description: 'Undangan Pernikahan · 20 Juni 2026 · Jakarta',
    type: 'website',
    url: 'https://managamvania.mrix.ai',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Managam & Vania Wedding' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Managam & Vania — 20.06.2026',
    description: '#BuildingMANAGAMVANturesWithGod',
    images: ['/og.jpg'],
  },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
