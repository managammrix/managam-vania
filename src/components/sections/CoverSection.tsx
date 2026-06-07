'use client'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

export default function CoverSection({ tr, isPostWedding = false, dateLabel = '20 · 06 · 2026' }: { tr: Translations; isPostWedding?: boolean; dateLabel?: string }) {
  const ref = useReveal()
  return (
    <section id="cover" ref={ref} style={{background:'var(--parchment)',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
      {/* hero background */}
      <div style={{position:'absolute',inset:0,zIndex:1,overflow:'hidden'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/prewedding/03.jpg"
          alt="Managam & Vania"
          style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:0.22,mixBlendMode:'normal'}}
          loading="eager"
          fetchPriority="high"
        />
      </div>
      {/* botanical corners */}
      <svg style={{position:'absolute',top:-10,left:-10,width:260,height:260,pointerEvents:'none',opacity:0.14}} viewBox="0 0 260 260">
        <g fill="none" stroke="#2d5a3d" strokeWidth="0.9">
          <path d="M10 130 C25 100,50 68,85 50 C65 78,54 108,64 135"/>
          <path d="M64 10 C50 36,34 62,24 98 C44 78,72 56,82 28"/>
          <path d="M85 50 C108 34,140 20,168 16"/>
          <ellipse cx="172" cy="14" rx="17" ry="9" transform="rotate(-22,172,14)" fill="#2d5a3d" fillOpacity="0.07"/>
          <path d="M64 135 C74 116,94 97,112 84"/>
          <ellipse cx="148" cy="108" rx="13" ry="7" transform="rotate(12,148,108)" fill="#2d5a3d" fillOpacity="0.06"/>
        </g>
      </svg>
      <svg style={{position:'absolute',bottom:-10,right:-10,width:260,height:260,pointerEvents:'none',opacity:0.14,transform:'rotate(180deg)'}} viewBox="0 0 260 260">
        <g fill="none" stroke="#2d5a3d" strokeWidth="0.9">
          <path d="M10 130 C25 100,50 68,85 50 C65 78,54 108,64 135"/>
          <path d="M64 10 C50 36,34 62,24 98 C44 78,72 56,82 28"/>
          <path d="M85 50 C108 34,140 20,168 16"/>
          <ellipse cx="172" cy="14" rx="17" ry="9" transform="rotate(-22,172,14)" fill="#2d5a3d" fillOpacity="0.07"/>
          <path d="M64 135 C74 116,94 97,112 84"/>
        </g>
      </svg>

      <div style={{position:'relative',zIndex:2,padding:'60px 40px',maxWidth:500,width:'100%'}}>
        <div className="reveal" style={{fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:5,color:'var(--sage)',marginBottom:24}}>{tr.wedding_of}</div>
        {/* Logo — perfect circle */}
        <div className="reveal reveal-d1" style={{width:180,height:180,borderRadius:'50%',overflow:'hidden',margin:'0 auto 24px',border:'1.5px solid var(--forest)',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mv-logo.jpg" alt="Monogram M&V" style={{width:'100%',height:'100%',objectFit:'cover',mixBlendMode:'multiply'}}/>
        </div>
        <h1 className="reveal reveal-d2" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(34px,8vw,56px)',fontWeight:300,fontStyle:'italic',color:'var(--forest-deep)',lineHeight:1.1,marginBottom:16}}>
          Managam<br/><span style={{fontSize:'0.65em',color:'var(--gold)'}}>&amp;</span><br/>Vania
        </h1>
        <div className="reveal reveal-d3" style={{fontFamily:'Cinzel,serif',fontSize:'clamp(24px,5vw,40px)',color:'var(--forest)',letterSpacing:5,margin:'18px 0 10px'}}>{dateLabel}</div>
        <p className="reveal reveal-d3" style={{fontSize:14,color:'var(--sage)',fontStyle:'italic',marginBottom:36,lineHeight:1.7}}>
          &ldquo;He who has been faithful<br/>so on will always remain faithful&rdquo;
        </p>
        <a className="reveal reveal-d4" href="#story"
          style={{display:'inline-flex',alignItems:'center',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:4,color:'var(--sage)',border:'0.5px solid var(--sage-light)',padding:'14px 28px',minHeight:44,cursor:'pointer',transition:'all 0.3s',textDecoration:'none'}}
          onMouseEnter={e=>{(e.target as HTMLElement).style.cssText+='background:var(--forest);color:var(--cream);border-color:var(--forest);'}}
          onMouseLeave={e=>{const el=e.target as HTMLElement;el.style.background='';el.style.color='var(--sage)';el.style.borderColor='var(--sage-light)'}}
        >{isPostWedding ? tr.open_invitation_post : tr.open_invitation}</a>
      </div>
    </section>
  )
}
