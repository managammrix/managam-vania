'use client'
import { useEffect, useState } from 'react'
import { Translations } from '@/lib/translations'
import { InviteeRow, submitRsvp, updateInviteeRsvp } from '@/lib/supabase'
import { useReveal } from '../useReveal'

interface Props {
  tr: Translations
  guestData: InviteeRow | null
  defaultMaxGuests: number
}

export default function RsvpSection({ tr, guestData, defaultMaxGuests }: Props) {
  const ref = useReveal()
  const [name, setName] = useState(guestData?.name ?? '')
  const [phone, setPhone] = useState(guestData?.phone ?? '')
  const [attending, setAttending] = useState<boolean | null>(null)
  const [guests, setGuests] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (guestData) {
      setName(guestData.name)
      setPhone(guestData.phone ?? '')
    }
  }, [guestData])

  const maxSeats = guestData?.max_guests ?? defaultMaxGuests

  const handleSubmit = async () => {
    if (!name.trim()) { alert(tr.alert_name); return }
    if (attending === null) { alert(tr.alert_attend); return }
    setLoading(true)
    const guestCount = attending ? guests : 0
    try {
      await submitRsvp({ name, phone, attending, guests: guestCount })
    } catch { /* still show success — store locally */ }
    // If this guest came in via a personal ref link, also update
    // the invitees row so the admin dashboard reflects their status.
    if (guestData?.ref) {
      try {
        await updateInviteeRsvp(guestData.ref, attending, guestCount)
      } catch (err) {
        console.error('[rsvp] invitee update error:', err)
      }
    }
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
              <input
                style={{
                  ...inputStyle,
                  background: guestData ? 'var(--cream-warm)' : 'transparent',
                  color: guestData ? 'var(--ink-soft)' : 'var(--ink)',
                }}
                value={name}
                onChange={e => !guestData && setName(e.target.value)}
                readOnly={!!guestData}
                placeholder={tr.rsvp_name_placeholder}
              />
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_phone}</label>
              <input
                style={{
                  ...inputStyle,
                  background: guestData ? 'var(--cream-warm)' : 'transparent',
                  color: guestData ? 'var(--ink-soft)' : 'var(--ink)',
                }}
                value={phone}
                onChange={e => !guestData && setPhone(e.target.value)}
                readOnly={!!guestData}
                placeholder="+62 ..."
              />
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_attendance}</label>
              <div className="rsvp-attendance-group" style={{display:'flex',gap:16}} role="group">
                {[
                  {value:true, label:tr.rsvp_attending},
                  {value:false, label:tr.rsvp_not_attending}
                ].map(opt => (
                  <label
                    key={String(opt.value)}
                    id={opt.value ? 'hadir-btn' : 'tidak-hadir-btn'}
                    style={{
                    flex:1,border:`0.5px solid ${attending===opt.value?'var(--forest)':'var(--cream-deep)'}`,
                    padding:'13px 14px',minHeight:44,cursor:'pointer',
                    fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:2,
                    color:attending===opt.value?'var(--cream)':'var(--ink-soft)',
                    background:attending===opt.value?'var(--forest)':'transparent',
                    display:'flex',alignItems:'center',gap:8,
                    transition:'all 0.3s',
                  }}>
                    <input
                      type="radio"
                      name="attendance"
                      value={String(opt.value)}
                      checked={attending === opt.value}
                      onChange={() => setAttending(opt.value)}
                      style={{position:'absolute',opacity:0,pointerEvents:'none'}}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            {attending === true && (
              <div style={{marginBottom:24}}>
                <label style={labelStyle}>{tr.rsvp_guests}</label>
                <select
                  id="seat-selector"
                  className="form-input"
                  value={guests}
                  onChange={e => setGuests(Number(e.target.value))}
                  style={{
                    width:'100%', border:0,
                    borderBottom:'1px solid var(--cream-deep)',
                    background:'transparent',
                    padding:'10px 0',
                    fontFamily:'EB Garamond,serif',
                    fontSize:16, color:'var(--ink)',
                    outline:'none',
                    appearance:'none',
                  }}
                >
                  {Array.from({length: maxSeats}, (_, i) => (
                    <option key={i+1} value={i+1}>
                      {i+1} tamu
                    </option>
                  ))}
                </select>
                <p style={{fontSize:12,color:'var(--sage)',marginTop:4}}>
                  Maksimal {maxSeats} tamu untuk undangan ini
                </p>
              </div>
            )}
            {attending === false && (
              <div style={{
                padding:'12px 16px',
                background:'var(--cream-warm)',
                borderRadius:8,
                fontSize:14,
                color:'var(--sage)',
                fontStyle:'italic',
                marginBottom:24,
              }}>
                Terima kasih telah memberitahu kami. Doa Anda tetap berarti bagi kami 🙏
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',background:'var(--forest)',color:'var(--cream)',border:'none',padding:16,fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:4,cursor:'pointer',opacity: loading?0.7:1}}>
              {loading ? '...' : tr.rsvp_submit}
            </button>
          </div>
        ) : (
          <div style={{
            textAlign:'center',
            padding:'48px 24px',
          }}>
            <div style={{fontSize:40, marginBottom:16}}>🌿</div>
            <h3 style={{
              fontFamily:'Cormorant Garamond,serif',
              fontSize:28, fontStyle:'italic',
              color:'var(--forest)', marginBottom:12,
            }}>Terima kasih!</h3>
            <p style={{
              fontFamily:'Cormorant Garamond,serif',
              fontSize:16, color:'var(--ink-soft)',
              lineHeight:1.7, marginBottom:8,
            }}>
              Kami sangat bersukacita menantikan<br/>
              kehadiran Anda pada hari yang penuh berkat.
            </p>
            <p style={{
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:3, color:'var(--sage)',
              marginTop:16,
            }}>
              #BuildingMANAGAMVANturesWithGod
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
