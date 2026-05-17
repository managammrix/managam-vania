'use client'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

export default function EventsSection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const card: React.CSSProperties = {background:'var(--parchment)',border:'0.5px solid var(--cream-deep)',padding:'36px 28px'}
  return (
    <section id="events" ref={ref} style={{background:'var(--cream-warm)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:680,width:'100%'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--forest-deep)',textAlign:'center',marginBottom:10}}>{tr.events_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage)',textAlign:'center',marginBottom:48}}>{tr.events_sub}</p>

        <style>{`@media(max-width:600px){.events-grid{grid-template-columns:1fr!important;}}`}</style>
        <div className="events-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          {/* Ceremony */}
          <div className="reveal reveal-d2" style={card}>
            <span style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,color:'var(--gold)',marginBottom:12,display:'block'}}>{tr.sat_label}</span>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:26,fontStyle:'italic',color:'var(--forest-deep)',marginBottom:16,lineHeight:1.2}}>{tr.ceremony_title}</div>
            <span style={{fontFamily:'Cinzel,serif',fontSize:13,letterSpacing:2,color:'var(--forest)',marginBottom:14,display:'block'}}>10:00 – 12:00 WIB</span>
            <div style={{fontSize:14,color:'var(--ink-soft)',lineHeight:1.75,marginBottom:20}}>
              GMS Central Park – Hall B<br/>
              Central Park Mall, Gedung Tribeca Lt. 1<br/>
              Jl. Letjen S. Parman No. Kav. 28<br/>
              RT.12/RW.6, Tj. Duren Sel.<br/>
              Kec. Grogol Petamburan<br/>
              Jakarta Barat 11470
            </div>
            <a href="https://maps.app.goo.gl/m5Xqevs1F16KMh6j8" target="_blank" rel="noopener noreferrer"
              style={{display:'inline-block',fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,color:'var(--forest)',border:'0.5px solid var(--forest)',padding:'9px 18px',textDecoration:'none'}}>{tr.open_maps}</a>
          </div>

          {/* Thanksgiving */}
          <div className="reveal reveal-d3" style={card}>
            <span style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,color:'var(--gold)',marginBottom:12,display:'block'}}>{tr.sun_label}</span>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:26,fontStyle:'italic',color:'var(--forest-deep)',marginBottom:16,lineHeight:1.2}}>{tr.thanksgiving_title}</div>
            <span style={{fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:2,color:'var(--forest)',marginBottom:14,display:'block'}}>{tr.congregation}</span>
            <div style={{fontSize:14,color:'var(--ink-soft)',lineHeight:1.75,marginBottom:20}}>
              GPPS Immanuel Kersana<br/>
              Jl. Raya No. 04, RT.01/RW.01<br/>
              Ciampel Kulon, Ciampel<br/>
              Kec. Kersana, Kabupaten Brebes<br/>
              Jawa Tengah 52264
            </div>
            <a href="https://maps.app.goo.gl/TjH32PzdXaAGXJJQ8" target="_blank" rel="noopener noreferrer"
              style={{display:'inline-block',fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:3,color:'var(--forest)',border:'0.5px solid var(--forest)',padding:'9px 18px',textDecoration:'none'}}>{tr.open_maps}</a>
          </div>
        </div>
      </div>
    </section>
  )
}
