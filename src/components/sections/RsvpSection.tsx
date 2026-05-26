'use client'
import { useEffect, useState } from 'react'
import { Translations } from '@/lib/translations'
import {
  InviteeRow, submitRsvp, updateInviteeRsvp,
  identifyPhysicalGuest, fetchRsvpNotifyConfig,
} from '@/lib/supabase'
import {
  sendRsvpAdminNotifications, buildRsvpNotification,
} from '@/lib/fonnte'
import { useReveal } from '../useReveal'

interface Props {
  tr: Translations
  guestData: InviteeRow | null
  defaultMaxGuests: number
}

// RSVP edits accepted until end-of-day Jakarta time on 14 June 2026.
// After this, the form is locked and the "Ubah kehadiran" link is
// hidden from the persisted ticket / decline screens.
const RSVP_DEADLINE_MS = new Date('2026-06-14T23:59:59+07:00').getTime()

export default function RsvpSection({ tr, guestData, defaultMaxGuests }: Props) {
  const ref = useReveal()
  const initialIsAnonPhysical = !!guestData &&
    guestData.type === 'physical' &&
    guestData.name.startsWith('Undangan Fisik')
  const [name, setName] = useState(initialIsAnonPhysical ? '' : (guestData?.name ?? ''))
  const [phone, setPhone] = useState(initialIsAnonPhysical ? '' : (guestData?.phone ?? ''))
  const [attending, setAttending] = useState<boolean | null>(null)
  const [guests, setGuests] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!guestData) return
    const isAnonPhysical = guestData.type === 'physical' &&
      guestData.name.startsWith('Undangan Fisik')
    // For anonymous physical slots, start with empty inputs so the
    // guest types their real name; placeholder isn't useful as a value.
    setName(isAnonPhysical ? '' : guestData.name)
    setPhone(isAnonPhysical ? '' : (guestData.phone ?? ''))
  }, [guestData])

  // Hydrate from server-side RSVP status. If the guest already
  // confirmed or declined in a previous visit, skip the form and
  // show the appropriate persistent screen (ticket / soft thanks).
  // For anonymous physical slots we never auto-skip — they always
  // need to identify themselves first.
  useEffect(() => {
    if (!guestData) return
    if (initialIsAnonPhysical) return
    if (guestData.rsvp_status === 'confirmed') {
      setAttending(true)
      setGuests(guestData.guests && guestData.guests > 0 ? guestData.guests : 1)
      setSubmitted(true)
    } else if (guestData.rsvp_status === 'declined') {
      setAttending(false)
      setSubmitted(true)
    }
  }, [guestData, initialIsAnonPhysical])

  // Regenerate the QR ticket on revisit so refreshed-confirmed
  // guests still see their ticket without needing to re-submit.
  useEffect(() => {
    if (!guestData) return
    if (guestData.rsvp_status !== 'confirmed') return
    if (qrDataUrl) return
    const guestRef = guestData.ref
    if (!guestRef) return
    let cancelled = false
    ;(async () => {
      try {
        const { generateQRTicket } = await import('@/lib/generateQR')
        const url = await generateQRTicket({
          name: guestData.name,
          ref: guestRef,
          guests: guestData.guests && guestData.guests > 0
            ? guestData.guests : 1,
        })
        if (!cancelled) setQrDataUrl(url)
      } catch (err) {
        console.error('[rsvp] qr regen error:', err)
      }
    })()
    return () => { cancelled = true }
  }, [guestData, qrDataUrl])

  const canEdit = Date.now() < RSVP_DEADLINE_MS

  // Per-invitee seat limit is `guests` itself; fall back to the
  // global default if the invitee row has no guests value set.
  const maxSeats = (guestData?.guests && guestData.guests > 0)
    ? guestData.guests
    : defaultMaxGuests

  const isPhysicalAnon = !!guestData &&
    guestData.type === 'physical' &&
    guestData.name.startsWith('Undangan Fisik')
  const isLocked = !!guestData && !isPhysicalAnon

  const handleSubmit = async () => {
    if (!name.trim()) { alert(tr.alert_name); return }
    if (attending === null) { alert(tr.alert_attend); return }
    setLoading(true)
    const guestCount = attending ? guests : 0
    try {
      await submitRsvp({ name, phone, attending, guests: guestCount })
    } catch { /* still show success — store locally */ }
    // Sync the invitees row so the admin dashboard reflects status.
    if (guestData?.ref) {
      try {
        if (isPhysicalAnon) {
          // Physical anon slot: update name + phone too (without check-in)
          await identifyPhysicalGuest(
            guestData.ref, name.trim(), phone.trim(), guestCount, attending
          )
        } else {
          await updateInviteeRsvp(guestData.ref, attending, guestCount)
        }
      } catch (err) {
        console.error('[rsvp] invitee update error:', err)
      }
    }
    // Fire-and-forget admin WA notification (Managam + Vania).
    // Errors here must never block the success UI for the guest.
    if (guestData?.ref) {
      const guestRef = guestData.ref
      const displayName = isPhysicalAnon ? name.trim() : guestData.name
      void (async () => {
        try {
          const cfg = await fetchRsvpNotifyConfig()
          if (!cfg.token || cfg.targets.length === 0) return
          await sendRsvpAdminNotifications({
            token: cfg.token,
            targets: cfg.targets,
            message: buildRsvpNotification({
              attending: attending === true,
              guestName: displayName,
              guests: guestCount,
              ref: guestRef,
            }),
          })
        } catch (e) {
          console.error('[rsvp] notify error:', e)
        }
      })()
    }

    if (attending && guestData?.ref) {
      try {
        const { generateQRTicket } = await import('@/lib/generateQR')
        const url = await generateQRTicket({
          name: isPhysicalAnon ? name.trim() : guestData.name,
          ref: guestData.ref,
          guests: guestCount,
        })
        setQrDataUrl(url)
      } catch (err) {
        console.error('[rsvp] qr generation error:', err)
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
                  background: isLocked ? 'var(--cream-warm)' : 'transparent',
                  color: isLocked ? 'var(--ink-soft)' : 'var(--ink)',
                }}
                value={name}
                onChange={e => !isLocked && setName(e.target.value)}
                readOnly={isLocked}
                placeholder={isPhysicalAnon ? 'Nama lengkap Anda' : tr.rsvp_name_placeholder}
              />
              {isPhysicalAnon && (
                <p style={{fontSize:12,color:'var(--sage)',marginTop:4,fontStyle:'italic'}}>
                  Silakan isi nama lengkap Anda
                </p>
              )}
            </div>
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>{tr.rsvp_phone}</label>
              <input
                style={{
                  ...inputStyle,
                  background: isLocked ? 'var(--cream-warm)' : 'transparent',
                  color: isLocked ? 'var(--ink-soft)' : 'var(--ink)',
                }}
                value={phone}
                onChange={e => !isLocked && setPhone(e.target.value)}
                readOnly={isLocked}
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
            <div style={{fontSize:40, marginBottom:16}}>
              {attending === false ? '🙏' : '🌿'}
            </div>
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
              {attending === false ? (
                <>
                  Terima kasih telah memberitahu kami.<br/>
                  Doa dan restu Anda tetap berarti bagi kami.
                </>
              ) : (
                <>
                  Kami sangat bersukacita menantikan<br/>
                  kehadiran Anda pada hari yang penuh berkat.
                </>
              )}
            </p>
            <p style={{
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:3, color:'var(--sage)',
              marginTop:16,
            }}>
              #BuildingMANAGAMVANturesWithGod
            </p>
            {attending !== false && qrDataUrl && (
              <div style={{marginTop:24, textAlign:'center'}}>
                <p style={{
                  fontFamily:'Cinzel,serif', fontSize:10,
                  letterSpacing:3, color:'var(--sage)',
                  marginBottom:12,
                }}>TIKET UNDANGAN ANDA</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR Ticket"
                  style={{
                    width:280, maxWidth:'100%',
                    borderRadius:12,
                    boxShadow:'0 4px 24px rgba(0,0,0,0.1)',
                    marginBottom:16,
                  }}
                />
                <p style={{
                  fontSize:12, color:'var(--ink-soft)',
                  lineHeight:1.6, marginBottom:16,
                }}>
                  Screenshot tiket ini dan tunjukkan<br/>
                  kepada panitia saat tiba di venue.
                </p>
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = qrDataUrl
                    a.download = 'tiket-mv2026.png'
                    a.click()
                  }}
                  style={{
                    padding:'12px 24px',
                    background:'var(--forest)',
                    color:'var(--cream)',
                    border:'none', borderRadius:8,
                    fontFamily:'Cinzel,serif',
                    fontSize:10, letterSpacing:2,
                    cursor:'pointer',
                  }}
                >UNDUH TIKET</button>
              </div>
            )}
            {canEdit && (
              <button
                id="ubah-kehadiran-btn"
                onClick={() => setSubmitted(false)}
                style={{
                  marginTop:28,
                  background:'transparent', border:'none',
                  padding:0, cursor:'pointer',
                  fontFamily:'Cinzel,serif', fontSize:10,
                  letterSpacing:2, color:'var(--sage)',
                  textDecoration:'underline',
                  textUnderlineOffset:4,
                }}
              >Ubah kehadiran</button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
