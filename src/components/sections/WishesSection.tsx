'use client'
import { useState, useEffect } from 'react'
import { Translations } from '@/lib/translations'
import { fetchWishes, addWish, WishRow } from '@/lib/supabase'
import { useReveal } from '../useReveal'

export default function WishesSection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const [wishes, setWishes] = useState<WishRow[]>([])
  const [author, setAuthor] = useState('')
  const [message, setMessage] = useState('')

  useEffect(()=>{
    fetchWishes().then(data=>{ if(data.length) setWishes(data) }).catch(()=>{})
  },[])

  const send = async () => {
    if(!author.trim()||!message.trim()) return
    const newWish = { author, message }
    setWishes(w=>[newWish,...w])
    setAuthor(''); setMessage('')
    try { await addWish(author, message) } catch {}
  }

  return (
    <section id="wishes" ref={ref} style={{background:'var(--forest-deep)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:640,width:'100%'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--cream)',textAlign:'center',marginBottom:10}}>{tr.wishes_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage-light)',textAlign:'center',marginBottom:0}}>{tr.wishes_sub}</p>

        <div className="reveal reveal-d2 wish-form" style={{marginTop:36,display:'flex',gap:10,flexWrap:'wrap'}}>
          <input value={author} onChange={e=>setAuthor(e.target.value)}
            placeholder={tr.wishes_name_ph}
            className="wish-name-input"
            style={{width:150,flexShrink:0,background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.14)',padding:'13px 16px',fontFamily:'EB Garamond,serif',fontSize:16,color:'var(--cream)',outline:'none'}}/>
          <input value={message} onChange={e=>setMessage(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder={tr.wishes_text_ph}
            style={{flex:1,minWidth:200,background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.14)',padding:'13px 16px',fontFamily:'EB Garamond,serif',fontSize:16,color:'var(--cream)',outline:'none'}}/>
          <button onClick={send}
            className="wish-send"
            style={{background:'var(--gold)',border:'none',padding:'13px 22px',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:3,color:'var(--forest-deep)',cursor:'pointer',flexShrink:0}}>{tr.wishes_send}</button>
        </div>

        <div style={{marginTop:28,maxHeight:380,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,paddingRight:6}}>
          {wishes.map((w,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.09)',padding:'20px 22px',animation:'fadeInUp 0.4s ease'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,color:'var(--gold-light)',marginBottom:8}}>{w.author.toUpperCase()}</div>
              <div style={{fontSize:16,color:'var(--cream-warm)',fontStyle:'italic',lineHeight:1.7}}>&ldquo;{w.message}&rdquo;</div>
            </div>
          ))}
        </div>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    </section>
  )
}
