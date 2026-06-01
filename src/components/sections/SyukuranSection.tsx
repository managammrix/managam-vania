'use client'
import { useReveal } from '../useReveal'

// Syukuran (Ibadah Ucapan Syukur) event card — shown instead of the Holy
// Matrimony card for invitees with type='syukuran'. Indonesian text is
// hardcoded since this is a single local church service. Keeps id="events"
// so NavDots still targets this section.
export default function SyukuranSection() {
  const ref = useReveal()
  const card: React.CSSProperties = { background: 'var(--parchment)', border: '0.5px solid var(--cream-deep)', padding: '36px 28px' }
  return (
    <section id="events" ref={ref} style={{ background: 'var(--cream-warm)', padding: '80px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 680, width: '100%' }}>
        <h2 className="reveal" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(28px,5vw,44px)', fontStyle: 'italic', fontWeight: 300, color: 'var(--forest-deep)', textAlign: 'center', marginBottom: 10 }}>Ibadah Ucapan Syukur</h2>
        <p className="reveal reveal-d1 section-sub" style={{ fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: 4, color: 'var(--sage)', textAlign: 'center', marginBottom: 48 }}>THANKSGIVING SERVICE</p>

        <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 440, margin: '0 auto' }}>
          <div className="reveal reveal-d2" style={card}>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: 3, color: 'var(--gold)', marginBottom: 12, display: 'block' }}>MINGGU · 21 JUNI 2026</span>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 26, fontStyle: 'italic', color: 'var(--forest-deep)', marginBottom: 16, lineHeight: 1.2 }}>GPPS Imanuel Kersana</div>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: 2, color: 'var(--forest)', marginBottom: 14, display: 'block' }}>17:00 – 19:00 WIB</span>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: 20 }}>
              Jl. Raya No. 04, RT.01/RW.01<br />
              Ciampel Kulon, Ciampel<br />
              Kec. Kersana, Kabupaten Brebes<br />
              Jawa Tengah 52264
            </div>
            <a href="https://maps.app.goo.gl/TjH32PzdXaAGXJJQ8" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: 3, color: 'var(--forest)', border: '0.5px solid var(--forest)', padding: '15px 18px', minHeight: 44, textDecoration: 'none' }}>BUKA PETA</a>
          </div>
        </div>
      </div>
    </section>
  )
}
