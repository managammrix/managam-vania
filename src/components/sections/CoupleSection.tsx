'use client'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

export default function CoupleSection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const card: React.CSSProperties = {textAlign:'center',padding:'36px 24px',border:'0.5px solid var(--cream-deep)',background:'var(--cream)'}
  return (
    <section id="couple" ref={ref} style={{background:'var(--parchment)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:780,width:'100%'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--forest-deep)',textAlign:'center',marginBottom:10}}>{tr.couple_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage)',textAlign:'center',marginBottom:52}}>{tr.couple_sub}</p>

        <style>{`@media(max-width:620px){.couple-grid{grid-template-columns:1fr!important;}.couple-sep{display:none!important;}}`}</style>
        <div className="couple-grid" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'0 36px',alignItems:'start'}}>
          {/* Managam */}
          <div className="reveal reveal-d2" style={card}>
            <div style={{width:76,height:76,borderRadius:'50%',background:'var(--forest)',margin:'0 auto 18px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel,serif',fontSize:26,color:'var(--cream)'}}>M</div>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:24,fontStyle:'italic',color:'var(--forest-deep)',marginBottom:4}}>Managam Raja Silalahi</div>
            <div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:2,color:'var(--gold)',marginBottom:12}}>S.Kom., M.Sc.</div>
            <div style={{marginBottom:18,textAlign:'center'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--gold)',marginBottom:3}}>HAGGAI 1:9</div>
              <div style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--gold)',marginBottom:6}}>PHILIPPIANS 3:14</div>
              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:12,fontStyle:'italic',color:'var(--sage)'}}>
                &ldquo;I press on toward the goal for the prize<br/>of the upward call of God in Christ Jesus.&rdquo;
              </div>
            </div>
            <div style={{fontSize:14,color:'var(--ink-soft)',lineHeight:1.9}}>
              {tr.son_of}<br/>
              <strong>Bapak Saut Silalahi</strong><br/>
              &amp; <strong>Ibu Erna Sitinjak, S.K.M.</strong>
            </div>
            <a href="https://instagram.com/managamsilalahi" target="_blank" rel="noopener noreferrer"
              style={{display:'inline-block',marginTop:14,fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--forest)',border:'0.5px solid var(--forest)',padding:'7px 16px',textDecoration:'none'}}>@ INSTAGRAM ↗</a>
          </div>

          {/* Separator */}
          <div className="couple-sep" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,paddingTop:36}}>
            <div style={{width:'0.5px',height:56,background:'var(--cream-deep)'}}/>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:32,fontStyle:'italic',color:'var(--gold)'}}>&amp;</div>
            <div style={{width:'0.5px',height:56,background:'var(--cream-deep)'}}/>
          </div>

          {/* Vania */}
          <div className="reveal reveal-d3" style={card}>
            <div style={{width:76,height:76,borderRadius:'50%',background:'var(--sage)',margin:'0 auto 18px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Cinzel,serif',fontSize:26,color:'var(--cream)'}}>V</div>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:24,fontStyle:'italic',color:'var(--forest-deep)',marginBottom:4}}>Vania</div>
            <div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:2,color:'var(--gold)',marginBottom:12}}>S.Psi.</div>
            <div style={{marginBottom:18,textAlign:'center'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--gold)',marginBottom:6}}>ECCLESIASTES 3:1</div>
              <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:12,fontStyle:'italic',color:'var(--sage)'}}>
                &ldquo;There is a time for everything, and a season<br/>for every activity under the heavens.&rdquo;
              </div>
            </div>
            <div style={{fontSize:14,color:'var(--ink-soft)',lineHeight:1.9}}>
              {tr.daughter_of}<br/>
              <strong>Bapak Pdt. Fredi (Tee Tjien Hian), S.Th.</strong><br/>
              &amp; <strong>Ibu Tan Tjoen Nio</strong>
            </div>
            <a href="https://instagram.com/vaniatee26" target="_blank" rel="noopener noreferrer"
              style={{display:'inline-block',marginTop:14,fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--forest)',border:'0.5px solid var(--forest)',padding:'7px 16px',textDecoration:'none'}}>@ INSTAGRAM ↗</a>
          </div>
        </div>
      </div>
    </section>
  )
}
