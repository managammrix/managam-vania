'use client'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

export default function ClosingSection({ tr }: { tr: Translations }) {
  const ref = useReveal()

  const addToCalendar = () => {
    const title = encodeURIComponent('Pernikahan Managam & Vania')
    const details = encodeURIComponent('#BuildingMANAGAMVANturesWithGod — GMS Central Park Hall B, Jakarta Barat')
    const loc = encodeURIComponent('GMS Central Park Hall B, Jl. Letjen S. Parman No. Kav. 28, Jakarta Barat')
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260620T100000/20260620T120000&details=${details}&location=${loc}`, '_blank')
  }

  const share = () => {
    const payload = { title:'Managam & Vania — 20.06.2026', text: tr.share_text, url: window.location.href }
    if (navigator.share) navigator.share(payload)
    else navigator.clipboard.writeText(window.location.href).then(()=>alert(tr.link_copied))
  }

  const btn: React.CSSProperties = {fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:3,padding:'12px 22px',border:'0.5px solid rgba(255,255,255,0.25)',color:'var(--cream)',textDecoration:'none',cursor:'pointer',background:'none',transition:'all 0.3s'}
  const btnPrimary: React.CSSProperties = {...btn,background:'var(--gold)',color:'var(--forest-deep)',border:'0.5px solid var(--gold)'}

  return (
    <section id="closing" ref={ref} style={{background:'var(--forest-deep)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'80px 40px',position:'relative',overflow:'hidden'}}>
      {/* bg botanical */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.04,pointerEvents:'none'}} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <g fill="#9db89f">
          <ellipse cx="100" cy="100" rx="90" ry="55" transform="rotate(-30,100,100)"/>
          <ellipse cx="700" cy="500" rx="90" ry="55" transform="rotate(20,700,500)"/>
          <ellipse cx="400" cy="300" rx="130" ry="75" transform="rotate(-10,400,300)"/>
          <circle cx="150" cy="500" r="65"/>
          <circle cx="650" cy="100" r="55"/>
        </g>
      </svg>

      <div style={{position:'relative',zIndex:2,maxWidth:500,width:'100%'}}>
        {/* Logo circle seal */}
        <div className="reveal" style={{width:110,height:110,borderRadius:'50%',border:'1px solid var(--gold)',margin:'0 auto 32px',overflow:'hidden',background:'var(--parchment)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mv-logo.jpg" alt="M&V" style={{width:'100%',height:'100%',objectFit:'cover',mixBlendMode:'multiply'}}/>
        </div>

        <p className="reveal reveal-d1" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(19px,3.5vw,28px)',fontStyle:'italic',fontWeight:300,color:'var(--cream-warm)',lineHeight:1.75,marginBottom:32}}>
          &ldquo;I love you today. Tomorrow is glory.<br/>
          I will love you always — growing, maturing, serving.<br/>
          I will love you faithfully, and hold on to you,<br/>
          loyal and triumphant.<br/>
          For all you are is precious to me.<br/>
          And every day I live with perfect divine love,<br/>
          for it is you.&rdquo;
        </p>

        <span className="reveal reveal-d2" style={{fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:1.5,color:'var(--gold)',marginBottom:40,display:'block'}}>#BuildingMANAGAMVANturesWithGod</span>

        <div className="reveal reveal-d2" style={{margin:'32px auto',textAlign:'center',maxWidth:460}}>
          <p style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(17px,3vw,24px)',fontStyle:'italic',fontWeight:300,color:'var(--cream-warm)',lineHeight:1.85,marginBottom:10}}>
            &ldquo;I press on toward the goal for the prize
            of the upward call of God in Christ Jesus.&rdquo;
          </p>
          <span style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:3,color:'var(--gold)',display:'block',marginBottom:4}}>PHILIPPIANS 3:14</span>
          <span style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--sage-light)',display:'block'}}>— Managam</span>
        </div>

        <div className="reveal reveal-d3" style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={addToCalendar} style={btnPrimary}>{tr.save_date}</button>
          <a href="#rsvp" style={btn}>{tr.rsvp_cta}</a>
          <button onClick={share} style={btn}>{tr.share_cta}</button>
        </div>

        <p className="reveal reveal-d4" style={{color:'var(--sage-light)',fontSize:14,fontStyle:'italic',marginTop:44,fontFamily:'Cormorant Garamond,serif',lineHeight:1.8}}>
          {tr.closing_body.split('\n').map((line,i)=>(
            <span key={i}>{line}{i<1&&<br/>}</span>
          ))}
        </p>
      </div>

      <div style={{position:'absolute',bottom:22,left:0,right:0,fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.18)',textAlign:'center'}}>
        MANAGAM &amp; VANIA · 20.06.2026 · JAKARTA
      </div>
    </section>
  )
}
