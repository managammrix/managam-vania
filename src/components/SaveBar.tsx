'use client'
import { useState, useEffect } from 'react'
import { Translations } from '@/lib/translations'

export default function SaveBar({ tr, isPostWedding = false }: { tr: Translations; isPostWedding?: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 1300); return () => clearTimeout(t) }, [])

  if (isPostWedding) return null

  const addToCalendar = () => {
    const title = encodeURIComponent('Pernikahan Managam & Vania')
    const details = encodeURIComponent('#BuildingMANAGAMVANturesWithGod — GMS Central Park Hall B, Jakarta Barat')
    const loc = encodeURIComponent('GMS Central Park Hall B, Jl. Letjen S. Parman No. Kav. 28, Jakarta Barat')
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260620T100000/20260620T120000&details=${details}&location=${loc}`, '_blank')
  }

  return (
    <>
    <style>{`@media(max-width:430px){.save-bar-wrapper{padding:10px 16px!important;gap:10px!important;}}`}</style>
    <div className="save-bar-wrapper" suppressHydrationWarning style={{
      position:'fixed',bottom:0,left:0,right:0,background:'var(--forest-deep)',
      display:'flex',alignItems:'center',justifyContent:'center',gap:18,
      padding:'13px 24px',zIndex:200,
      transform: show ? 'translateY(0)' : 'translateY(100%)',
      transition:'transform 0.4s ease',
      borderTop:'0.5px solid rgba(255,255,255,0.08)',
    }}>
      <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:13,fontStyle:'italic',color:'var(--cream-warm)',whiteSpace:'nowrap',letterSpacing:0}}>
        Managam &amp; Vania · 20 Juni 2026
      </span>
      <button onClick={addToCalendar} style={{
        fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,
        background:'var(--gold)',color:'var(--forest-deep)',border:'none',
        padding:'9px 18px',cursor:'pointer',flexShrink:0,
      }}>{tr.save_date}</button>
      <button onClick={() => setShow(false)} style={{
        background:'none',border:'none',color:'var(--sage-light)',
        cursor:'pointer',fontSize:20,lineHeight:1,
        minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',
      }}>×</button>
    </div>
    </>
  )
}
