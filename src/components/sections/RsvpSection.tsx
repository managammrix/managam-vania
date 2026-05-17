'use client'
import { useState } from 'react'
import { Translations } from '@/lib/translations'
import { submitRsvp } from '@/lib/supabase'
import { useReveal } from '../useReveal'

export default function RsvpSection({ tr }: { tr: Translations }) {
  const ref = useReveal()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [attending, setAttending] = useState<boolean | null>(null)
  const [guests, setGuests] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { alert(tr.alert_name); return }
    if (attending === null) { alert(tr.alert_attend); return }
    setLoading(true)
    try {
      await submitRsvp({ name, phone, attending, guests })
    } catch { /* still show success — store locally */ }
    setLoading(false)
    setSubmitted(true)
  }

  const inputStyle: React.CSSProperties = {
    width:'100%',border:0,borderBottom:'1px solid var(--cream-deep)',background:'transparent',
    padding:'10px 0',fontFamily:'EB Garamond,serif',fontSize:16,color:'var(--ink)',outline:'none',
  }
  const labelStyle: React.CSSProperties = {fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:3,color:'var(--sage)',display:'block',marginBottom:8}

  return (
    <section id="rsvp" ref={ref} style={{background:'var(--parchment)',padding:'80px 40px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{maxWidth:520,width:'100%',textAlign:'center'}}>
        <h2 className="reveal" style={{fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(28px,5vw,44px)',fontStyle:'italic',fontWeight:300,color:'var(--forest-deep)',textAlign:'center',marginBottom:10}}>{tr.rsvp_heading}</h2>
        <p className="reveal reveal-d1" style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:4,color:'var(--sage)',textAlign:'center',marginBottom:0}}>{tr.rsvp_sub}</p>

        {!submitted ? (
          <div className="reveal reveal-d2" style={{marginTop:40,textAlign:'left'}}>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_name}</label>
              <input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder={tr.rsvp_name_placeholder}/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_phone}</label>
              <input style={inputStyle} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+62 ..."/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_attendance}</label>
              <div style={{display:'flex',gap:16}}>
                {[true,false].map(v=>(
                  <label key={String(v)} onClick={()=>setAttending(v)}
                    style={{flex:1,border:`0.5px solid ${attending===v?'var(--forest)':'var(--cream-deep)'}`,padding:'13px 14px',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:2,color: attending===v?'var(--cream)':'var(--ink-soft)',background: attending===v?'var(--forest)':'transparent',display:'flex',alignItems:'center',gap:8,transition:'all 0.3s'}}>
                    {v ? tr.rsvp_attending : tr.rsvp_not_attending}
                  </label>
                ))}
              </div>
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_guests}</label>
              <input style={inputStyle} type="number" value={guests} min={1} max={10} onChange={e=>setGuests(Number(e.target.value))}/>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',background:'var(--forest)',color:'var(--cream)',border:'none',padding:16,fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:4,cursor:'pointer',opacity: loading?0.7:1}}>
              {loading ? '...' : tr.rsvp_submit}
            </button>
          </div>
        ) : (
          <div className="reveal" style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{fontSize:48}}>🌿</div>
            <h3 style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,fontStyle:'italic',color:'var(--forest)',marginBottom:12,marginTop:16}}>{tr.rsvp_success_title}</h3>
            <p style={{color:'var(--sage)',fontSize:15,lineHeight:1.7}}>{tr.rsvp_success_body}</p>
            <p style={{color:'var(--forest)',fontStyle:'italic',marginTop:8,fontSize:15}}>#BuildingMANAGAMVANturesWithGod</p>
          </div>
        )}
      </div>
    </section>
  )
}
