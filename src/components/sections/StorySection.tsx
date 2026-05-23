'use client'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

type Milestone = { date: string; titleKey: keyof Translations; detailKey: keyof Translations; highlight?: boolean }

const milestones: Milestone[] = [
  { date:'2.10.2022',   titleKey:'m1_title', detailKey:'m1_detail' },
  { date:'21.06.2023',  titleKey:'m2_title', detailKey:'m2_detail' },
  { date:'11.05.2024',  titleKey:'m3_title', detailKey:'m3_detail' },
  { date:'29.06.2024\n–\n16.05.2025', titleKey:'m4_title', detailKey:'m4_detail' },
  { date:'16.05.2025',  titleKey:'m5_title', detailKey:'m5_detail' },
  { date:'21.06.2025',  titleKey:'m6_title', detailKey:'m6_detail' },
  { date:'26.02.2026',  titleKey:'m7_title', detailKey:'m7_detail' },
  { date:'20.06\n2026', titleKey:'m8_title', detailKey:'m8_detail', highlight: true },
]

export default function StorySection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  return (
    <section id="story" ref={ref} style={{background:'var(--forest-deep)',display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 40px'}}>
      <div style={{maxWidth:660,width:'100%',textAlign:'center',color:'var(--cream)'}}>
        <span className="reveal" style={{fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:5,opacity:0.45,marginBottom:32,display:'block'}}>{tr.our_story}</span>

        <div className="reveal reveal-d2" style={{maxWidth:540,margin:'0 auto',textAlign:'left',position:'relative'}}>
          {/* timeline line */}
          <div style={{position:'absolute',left:84,top:8,bottom:8,width:'0.5px',background:'rgba(255,255,255,0.1)'}}/>
          {milestones.map(({ date, titleKey, detailKey, highlight }) => (
            <div key={titleKey} style={{display:'grid',gridTemplateColumns:'84px 1fr',gap:'0 20px',padding:'16px 0',borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:9.5,letterSpacing:0.3,color: highlight ? 'var(--gold-light)' : 'var(--gold)',paddingTop:3,textAlign:'right',paddingRight:20,lineHeight:1.5,whiteSpace:'pre-line'}}>{date}</div>
              <div>
                <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:18,fontStyle:'italic',color: highlight ? 'var(--gold-light)' : 'var(--cream)',marginBottom:3}}>{tr[titleKey]}</div>
                <div style={{fontSize:13.5,color:'var(--sage-light)',lineHeight:1.55}}>{tr[detailKey]}</div>
              </div>
            </div>
          ))}
        </div>

        <span className="reveal reveal-d4" style={{fontFamily:'Cormorant Garamond,serif',fontSize:16,color:'var(--gold)',marginTop:40,display:'block'}}>#BuildingMANAGAMVANturesWithGod</span>
      </div>
    </section>
  )
}
