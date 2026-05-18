'use client'
import { useState, useEffect } from 'react'
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

export default function GallerySection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const [photos, setPhotos] = useState<(PhotoRow|null)[]>(Array(18).fill(null))
  const [lightbox, setLightbox] = useState<string|null>(null)

  useEffect(() => {
    fetchGalleryPhotos().then(data => {
      if (data.length) {
        setPhotos(Array(18).fill(null).map((_, i) => data[i] ?? null))
      }
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <section id="gallery" ref={ref} style={{background:'var(--forest-deep)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Pre-wedding photo"
            style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:4}}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{position:'absolute',top:24,right:24,background:'none',border:'none',color:'white',fontSize:32,cursor:'pointer',lineHeight:1,fontFamily:'Cinzel,serif'}}
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
                onClick={() => photo && setLightbox(photo.url)}
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
