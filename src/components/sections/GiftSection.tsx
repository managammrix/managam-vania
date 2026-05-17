'use client'
import { useState } from 'react'
import { Translations } from '@/lib/translations'
import { useReveal } from '../useReveal'

const accounts = [
  { bank:'BCA', full:'Bank Central Asia', number:'4830415535', name:'a/n Vania' },
  { bank:'SUPERBANK', full:'Superbank', number:'000026988683', name:'a/n Vania' },
  { bank:'SEABANK', full:'SeaBank Indonesia', number:'901561780742', name:'a/n Vania' },
]

export default function GiftSection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const [copied, setCopied] = useState<string|null>(null)

  const copy = (num: string) => {
    navigator.clipboard.writeText(num).then(()=>{
      setCopied(num)
      setTimeout(()=>setCopied(null), 2200)
    })
  }

  return (
    <section id="gift" ref={ref} style={{background:'var(--cream-warm)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:640,width:'100%',textAlign:'center'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--forest-deep)',textAlign:'center',marginBottom:10}}>{tr.gift_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage)',textAlign:'center',marginBottom:0}}>{tr.gift_sub}</p>
        <p className="reveal reveal-d2" style={{fontSize:16,lineHeight:1.85,color:'var(--ink-soft)',margin:'32px 0 40px',fontStyle:'italic'}}>{tr.gift_note}</p>

        <div className="reveal reveal-d2" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,textAlign:'left'}}>
          {accounts.map(acc => (
            <div key={acc.bank} style={{border:'0.5px solid var(--cream-deep)',padding:'24px 20px',background:'var(--parchment)'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:3,color:'var(--forest)',marginBottom:10}}>{acc.bank}</div>
              <div style={{fontSize:13,color:'var(--sage)',marginBottom:4}}>{acc.full}</div>
              <div style={{fontFamily:'Cinzel,serif',fontSize:15,color:'var(--ink)',letterSpacing:1,margin:'10px 0',wordBreak:'break-all',lineHeight:1.4}}>{acc.number}</div>
              <div style={{fontSize:12,color:'var(--sage)',marginBottom:14}}>{acc.name}</div>
              <button onClick={()=>copy(acc.number)}
                style={{background:'none',border:'0.5px solid var(--cream-deep)',padding:'7px 14px',fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color: copied===acc.number?'var(--cream)':'var(--sage)',background: copied===acc.number?'var(--forest)':'none',cursor:'pointer',width:'100%',transition:'all 0.3s'}}>
                {copied===acc.number ? tr.gift_copied : tr.gift_copy}
              </button>
            </div>
          ))}
        </div>

        <p className="reveal reveal-d4" style={{fontSize:13,color:'var(--sage)',textAlign:'center',marginTop:24,fontStyle:'italic'}}>{tr.gift_envelope}</p>
      </div>
    </section>
  )
}
