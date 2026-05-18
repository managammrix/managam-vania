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
    images: [{ url: 'https://bawnvpgjpueqdebjqcjp.supabase.co/storage/v1/object/public/prewedding/03.jpg', width: 1200, height: 630, alt: 'Managam & Vania — 20.06.2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Managam & Vania — 20.06.2026',
    description: '#BuildingMANAGAMVANturesWithGod',
    images: ['https://bawnvpgjpueqdebjqcjp.supabase.co/storage/v1/object/public/prewedding/03.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Cinzel:wght@400;500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
