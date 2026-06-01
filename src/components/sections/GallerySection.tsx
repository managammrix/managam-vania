'use client'
import { useState, useEffect, useRef } from 'react'
import { Translations } from '@/lib/translations'
import { fetchGalleryPhotos, PhotoRow } from '@/lib/supabase'
import { useReveal } from '../useReveal'

// 18-slot editorial layout — class names drive CSS grid spans
const SLOT_CLASSES = [
  'hero',  // 0: 2×2
  'sq',    // 1
  'tall',  // 2: 1×2
  'sq',    // 3
  'wide',  // 4: 2×1
  'sq',    // 5
  'sq',    // 6
  'sq',    // 7
  'sq',    // 8
  'sq',    // 9
  'sq',    // 10
  'sq',    // 11
  'wide',  // 12: 2×1
  'sq',    // 13
  'sq',    // 14
  'sq',    // 15
  'sq',    // 16
  'sq',    // 17
]

const PlaceholderIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="var(--sage-light)" strokeWidth="1.2" width={24} height={24}>
    <rect x="2" y="6" width="28" height="20" rx="3"/>
    <circle cx="16" cy="16" r="5"/>
    <path d="M10 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
  </svg>
)

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.35)',
    border: 'none',
    color: 'white',
    fontSize: 32,
    cursor: 'pointer',
    lineHeight: 1,
    fontFamily: 'Cinzel,serif',
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

export default function GallerySection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const [photos, setPhotos] = useState<(PhotoRow|null)[]>(Array(18).fill(null))
  // Navigate over the loaded photos only (the 18-slot grid contains nulls).
  const loaded = photos.filter((p): p is PhotoRow => p !== null)
  const [lightboxIdx, setLightboxIdx] = useState<number|null>(null)
  const [imgLoading, setImgLoading] = useState(false)

  const closeLightbox = () => setLightboxIdx(null)
  const showNext = () =>
    setLightboxIdx(i => i === null ? i : (i + 1) % loaded.length)
  const showPrev = () =>
    setLightboxIdx(i => i === null ? i : (i - 1 + loaded.length) % loaded.length)

  useEffect(() => {
    fetchGalleryPhotos().then(data => {
      if (data.length) {
        setPhotos(Array(18).fill(null).map((_, i) => data[i] ?? null))
      }
    })
  }, [])

  useEffect(() => {
    if (lightboxIdx === null) return
    const n = loaded.length
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null)
      else if (e.key === 'ArrowRight') setLightboxIdx(i => i === null ? i : (i + 1) % n)
      else if (e.key === 'ArrowLeft') setLightboxIdx(i => i === null ? i : (i - 1 + n) % n)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, loaded.length])

  // Show a spinner until the (possibly uncached) photo decodes, and warm the
  // adjacent photos so most prev/next clicks land instantly.
  useEffect(() => {
    if (lightboxIdx === null) return
    setImgLoading(true)
    const n = loaded.length
    if (n > 1) {
      const next = loaded[(lightboxIdx + 1) % n]
      const prev = loaded[(lightboxIdx - 1 + n) % n]
      if (next) new Image().src = next.url
      if (prev) new Image().src = prev.url
    }
    // Re-run only on navigation / photo-count change, not on every render
    // (loaded is a fresh array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, loaded.length])

  // Swipe / tap handling for the overlay.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = touchStart.current
    touchStart.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) showNext()
      else showPrev()
      return
    }
    // Tap on the dark background (not the image/buttons) closes the lightbox.
    if (e.target === e.currentTarget && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      closeLightbox()
    }
  }

  return (
    <section id="gallery" ref={ref} style={{background:'var(--forest-deep)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {lightboxIdx !== null && loaded[lightboxIdx] && (
        <div
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out',touchAction:'none'}}
        >
          {imgLoading && <div className="lb-spinner" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={loaded[lightboxIdx].url}
            src={loaded[lightboxIdx].url}
            alt="Pre-wedding photo"
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
            style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:4,pointerEvents:'none',opacity:imgLoading?0:1,transition:'opacity 0.25s ease'}}
          />
          {loaded.length > 1 && (
            <>
              <button
                aria-label="Sebelumnya"
                onPointerDown={(e) => { e.stopPropagation(); showPrev() }}
                style={navBtnStyle('left')}
              >‹</button>
              <button
                aria-label="Berikutnya"
                onPointerDown={(e) => { e.stopPropagation(); showNext() }}
                style={navBtnStyle('right')}
              >›</button>
            </>
          )}
          <button
            aria-label="Tutup"
            onPointerDown={(e) => { e.stopPropagation(); closeLightbox() }}
            style={{position:'absolute',top:24,right:24,background:'none',border:'none',color:'white',fontSize:24,cursor:'pointer',lineHeight:1,fontFamily:'Cinzel,serif',minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center'}}
          >×</button>
        </div>
      )}

      <div style={{maxWidth:760,width:'100%'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--cream-warm)',textAlign:'center',marginBottom:10}}>{tr.gallery_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage-light)',textAlign:'center',marginBottom:0}}>{tr.gallery_sub}</p>

        <style>{`
          .gallery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:48px;}
          .g-item{background:var(--cream-warm);border:0.5px solid rgba(255,255,255,0.1);overflow:hidden;cursor:zoom-in;transition:transform 0.3s,opacity 0.3s;aspect-ratio:1;display:flex;align-items:center;justify-content:center;}
          .g-item.empty{cursor:default;}
          .g-item:hover{transform:scale(0.97);opacity:0.88;}
          .g-item img{width:100%;height:100%;object-fit:cover;display:block;}
          .g-item.hero{grid-column:span 2;grid-row:span 2;}
          .g-item.wide{grid-column:span 2;aspect-ratio:2/1;}
          .g-item.tall{grid-row:span 2;aspect-ratio:1/2;}
          .g-ph{display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.25;}
          .g-ph span{font-family:Cinzel,serif;font-size:7px;letter-spacing:2px;color:var(--sage-light);}
          .lb-spinner{position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:3px solid rgba(237,229,212,0.25);border-top-color:var(--sage-light);animation:mv-spin 0.8s linear infinite;pointer-events:none;}
          @keyframes mv-spin{to{transform:rotate(360deg);}}
          @media(max-width:640px){
            .gallery-grid{grid-template-columns:repeat(3,1fr);}
            .g-item.hero{grid-column:span 2;}
            .g-item.wide{grid-column:span 3;aspect-ratio:3/1;}
            .g-item.tall{grid-row:span 1;aspect-ratio:1;}
          }
        `}</style>

        <div className="gallery-grid reveal reveal-d2">
          {SLOT_CLASSES.map((cls, i) => {
            const photo = photos[i]
            return (
              <div
                key={i}
                className={`g-item ${cls}${!photo ? ' empty' : ''}`}
                onClick={() => {
                  if (!photo) return
                  const idx = loaded.findIndex(p => p.url === photo.url)
                  if (idx >= 0) setLightboxIdx(idx)
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={`Foto pra-nikah ${i + 1}`}
                    loading={i < 4 ? 'eager' : 'lazy'}
                    {...(i < 4 ? { fetchPriority: 'high' } : {})}
                  />
                ) : (
                  <div className="g-ph"><PlaceholderIcon/><span>{String(i + 1).padStart(2, '0')}</span></div>
                )}
              </div>
            )
          })}
        </div>

        <div className="reveal reveal-d3" style={{textAlign:'center',marginTop:28}}>
          <p style={{fontSize:14,color:'var(--sage-light)',marginBottom:6}}>{tr.gallery_share}</p>
          <strong style={{fontFamily:'Cormorant Garamond,serif',color:'var(--sage-light)',fontSize:18,fontStyle:'italic',opacity:0.8}}>#BuildingMANAGAMVANturesWithGod</strong>
        </div>
      </div>
    </section>
  )
}
