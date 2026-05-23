'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, logMessage, InviteeRow }
  from '@/lib/supabase'
import { sendBulkWhatsApp } from '@/lib/fonnte'
import { useAdminAuth } from '@/lib/adminAuth'
import { TEMPLATES, Template, TemplateVersion } from '@/lib/templates'

const RECOMMENDED_TEMPLATE: Record<string,string> = {
  pending:  'Undangan Awal',
  confirmed: 'H-7',
  honored:  'Tamu Kehormatan',
  all:      '',
}

export default function MessagesPage() {
  useAdminAuth()
  const [invitees, setInvitees] = useState<InviteeRow[]>([])
  const [tokenAgam, setTokenAgam] = useState('')
  const [tokenVania, setTokenVania] = useState('')
  const [activeToken, setActiveToken] =
    useState<'agam'|'vania'>('agam')
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template>(TEMPLATES[0])
  const [selectedVersion, setSelectedVersion] =
    useState<TemplateVersion>(TEMPLATES[0].versions[0])
  const [message, setMessage] = useState(
    TEMPLATES[0].versions[0].message
  )
  const [recipientFilter, setRecipientFilter] =
    useState<'all'|'pending'|'confirmed'|'honored'>('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    sent:number; failed:number
  }|null>(null)
  const [log, setLog] = useState<Array<{
    time:string; count:number; status:string
  }>>([])

  useEffect(() => {
    fetchInvitees().then(setInvitees).catch(() => {})
    const saved = localStorage.getItem('fonnte_token')
    const savedV = localStorage.getItem('fonnte_token_vania')
    if (saved) setTokenAgam(saved)
    if (savedV) setTokenVania(savedV)
  }, [])

  const selectTemplate = (tmpl: Template) => {
    setSelectedTemplate(tmpl)
    setSelectedVersion(tmpl.versions[0])
    setMessage(tmpl.versions[0].message)
  }

  const selectVersion = (ver: TemplateVersion) => {
    setSelectedVersion(ver)
    setMessage(ver.message)
  }

  const recipients: InviteeRow[] = invitees.filter(i => {
    if (recipientFilter === 'pending')
      return i.rsvp_status === 'pending'
    if (recipientFilter === 'confirmed')
      return i.attending === true
    if (recipientFilter === 'honored')
      return i.guests === 0
    return true
  })

  const send = async () => {
    if (!tokenAgam && !tokenVania) {
      alert('Masukkan minimal satu Fonnte token.')
      return
    }
    if (!message) return
    if (!confirm(
      `Kirim ke ${recipients.length} penerima?`
    )) return

    setSending(true)
    setResult(null)

    const agamRecipients = recipients.filter(
      i => (i.sender ?? 'agam') === 'agam'
    )
    const vaniaRecipients = recipients.filter(
      i => i.sender === 'vania'
    )

    let totalSent = 0
    let totalFailed = 0

    try {
      if (agamRecipients.length > 0 && tokenAgam) {
        const res = await sendBulkWhatsApp(
          tokenAgam,
          agamRecipients.map(i => ({ name: i.name, phone: i.phone })),
          message
        )
        totalSent += res.sent
        totalFailed += res.failed
      } else if (agamRecipients.length > 0 && !tokenAgam) {
        totalFailed += agamRecipients.length
      }

      if (vaniaRecipients.length > 0 && tokenVania) {
        const res = await sendBulkWhatsApp(
          tokenVania,
          vaniaRecipients.map(i => ({ name: i.name, phone: i.phone })),
          message
        )
        totalSent += res.sent
        totalFailed += res.failed
      } else if (vaniaRecipients.length > 0 && !tokenVania) {
        totalFailed += vaniaRecipients.length
      }

      const finalResult = { sent: totalSent, failed: totalFailed }
      setResult(finalResult)

      await logMessage({
        recipient_count: totalSent,
        message,
        recipients,
        status: totalFailed === 0 ? 'sent' : 'partial',
      })

      setLog(l => [{
        time: new Date().toLocaleTimeString('id'),
        count: totalSent,
        status: totalFailed === 0
          ? 'Berhasil'
          : `${totalSent} berhasil, ${totalFailed} gagal`,
      }, ...l])
    } finally { setSending(false) }
  }

  const ta: React.CSSProperties = {
    width:'100%', padding:'12px 14px',
    border:'0.5px solid #d9cdb8', borderRadius:8,
    fontSize:14, fontFamily:'inherit', outline:'none',
    resize:'vertical',
  }

  return (
    <div>
      <h1 style={{
        fontFamily:'Cormorant Garamond,serif',
        fontSize:32, fontStyle:'italic',
        color:'#1e3d2a', marginBottom:32,
      }}>Kirim Pesan</h1>

      <div style={{
        display:'grid',
        gridTemplateColumns:'1fr 1fr', gap:24,
      }}>
        <div style={{
          background:'white', borderRadius:12,
          padding:'24px', border:'0.5px solid #ede5d4',
        }}>
          <div style={{
            fontFamily:'Cinzel,serif', fontSize:10,
            letterSpacing:3, color:'#6b8f71',
            marginBottom:16,
          }}>TEMPLATE</div>
          <div style={{
            display:'flex', flexWrap:'wrap', gap:8,
          }}>
            {TEMPLATES.map(tmpl => (
              <button key={tmpl.label}
                onClick={() => selectTemplate(tmpl)}
                style={{
                  padding:'6px 14px', borderRadius:6,
                  border:'0.5px solid #d9cdb8',
                  background: selectedTemplate.label===tmpl.label
                    ? '#1e3d2a' : 'white',
                  color: selectedTemplate.label===tmpl.label
                    ? 'white' : '#888',
                  fontSize:12, cursor:'pointer',
                }}>{tmpl.label}</button>
            ))}
          </div>

          <div style={{
            display:'flex', gap:6, marginTop:8,
            marginBottom:16,
          }}>
            {selectedTemplate.versions.map(ver => (
              <button key={ver.label}
                onClick={() => selectVersion(ver)}
                style={{
                  padding:'4px 12px', borderRadius:4,
                  border:'0.5px solid #d9cdb8',
                  background: selectedVersion.label===ver.label
                    ? '#6b8f71' : 'white',
                  color: selectedVersion.label===ver.label
                    ? 'white' : '#888',
                  fontSize:11, cursor:'pointer',
                  fontFamily:'Cinzel,serif',
                  letterSpacing:1,
                }}>{ver.label}</button>
            ))}
            <span style={{
              fontSize:11, color:'#aaa',
              alignSelf:'center', marginLeft:4,
            }}>
              {message.length} karakter
            </span>
          </div>

          <div style={{
            fontFamily:'Cinzel,serif', fontSize:10,
            letterSpacing:3, color:'#6b8f71',
            marginBottom:8,
          }}>PESAN</div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={12}
            style={ta}
          />
          <p style={{
            fontSize:12, color:'#aaa', marginTop:6,
          }}>
            Gunakan {'{name}'} untuk nama penerima
          </p>
        </div>

        <div style={{display:'flex',flexDirection:'column',
          gap:20}}>

          <div style={{
            background:'white', borderRadius:12,
            padding:'24px', border:'0.5px solid #ede5d4',
          }}>
            <div style={{
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:3, color:'#6b8f71',
              marginBottom:12,
            }}>FONNTE TOKEN</div>

            <div style={{
              display:'flex', gap:8, marginBottom:16,
            }}>
              {[
                {key:'agam', label:'Managam'},
                {key:'vania', label:'Vania'},
              ].map(s => (
                <button key={s.key}
                  onClick={() => setActiveToken(
                    s.key as 'agam'|'vania'
                  )}
                  style={{
                    flex:1, padding:'8px',
                    borderRadius:8,
                    border:'0.5px solid #d9cdb8',
                    background: activeToken===s.key
                      ? '#1e3d2a' : 'white',
                    color: activeToken===s.key
                      ? 'white' : '#888',
                    fontSize:12, cursor:'pointer',
                    fontFamily:'Cinzel,serif',
                    letterSpacing:1,
                  }}>{s.label}</button>
              ))}
            </div>

            {activeToken === 'agam' && (
              <>
                <input
                  type="password"
                  placeholder="Token Fonnte Managam"
                  value={tokenAgam}
                  onChange={e => {
                    setTokenAgam(e.target.value)
                    if (e.target.value) localStorage.setItem(
                      'fonnte_token', e.target.value
                    )
                  }}
                  style={{
                    width:'100%', padding:'10px 12px',
                    border:'0.5px solid #d9cdb8',
                    borderRadius:8, fontSize:14,
                    outline:'none', marginBottom:6,
                  }}
                />
                <div style={{
                  display:'flex', alignItems:'center',
                  justifyContent:'space-between',
                }}>
                  <p style={{fontSize:11, color:'#aaa'}}>
                    Dari WA Managam ke tamu Managam
                  </p>
                  {tokenAgam && (
                    <span style={{
                      fontSize:10, color:'#2d5a3d',
                      fontFamily:'Cinzel,serif',
                      letterSpacing:1,
                    }}>✓ TERSIMPAN</span>
                  )}
                </div>
              </>
            )}

            {activeToken === 'vania' && (
              <>
                <input
                  type="password"
                  placeholder="Token Fonnte Vania"
                  value={tokenVania}
                  onChange={e => {
                    setTokenVania(e.target.value)
                    if (e.target.value) localStorage.setItem(
                      'fonnte_token_vania', e.target.value
                    )
                  }}
                  style={{
                    width:'100%', padding:'10px 12px',
                    border:'0.5px solid #d9cdb8',
                    borderRadius:8, fontSize:14,
                    outline:'none', marginBottom:6,
                  }}
                />
                <div style={{
                  display:'flex', alignItems:'center',
                  justifyContent:'space-between',
                }}>
                  <p style={{fontSize:11, color:'#aaa'}}>
                    Dari WA Vania ke tamu Vania
                  </p>
                  {tokenVania && (
                    <span style={{
                      fontSize:10, color:'#2d5a3d',
                      fontFamily:'Cinzel,serif',
                      letterSpacing:1,
                    }}>✓ TERSIMPAN</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{
            background:'white', borderRadius:12,
            padding:'24px', border:'0.5px solid #ede5d4',
          }}>
            <div style={{
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:3, color:'#6b8f71',
              marginBottom:12,
            }}>PENERIMA</div>
            {(['all','pending','confirmed','honored'] as const).map(f => (
              <label key={f} style={{
                display:'flex', alignItems:'center',
                gap:10, marginBottom:10, cursor:'pointer',
                fontSize:14,
              }}>
                <input type="radio" name="filter"
                  checked={recipientFilter===f}
                  onChange={() => setRecipientFilter(f)}
                />
                {f==='all' ?
                  `Semua tamu (${invitees.length})` :
                 f==='pending' ?
                  `Belum RSVP (${invitees.filter(
                    i=>i.rsvp_status==='pending'
                  ).length})` :
                 f==='confirmed' ?
                  `Konfirmasi hadir (${invitees.filter(
                    i=>i.attending
                  ).length})` :
                  `Tamu Kehormatan (${invitees.filter(
                    i=>i.guests===0
                  ).length})`
                }
              </label>
            ))}
          </div>

          {recipientFilter !== 'all' &&
           RECOMMENDED_TEMPLATE[recipientFilter] &&
           selectedTemplate.label !== RECOMMENDED_TEMPLATE[recipientFilter] && (
            <div style={{
              padding:'12px 16px',
              background:'#fff8ec',
              border:'0.5px solid #f0a500',
              borderRadius:8,
              fontSize:13,
              color:'#b8600a',
              marginBottom:12,
            }}>
              ⚠️ Template yang dipilih tidak sesuai dengan
              filter penerima. Disarankan:
              <strong> {RECOMMENDED_TEMPLATE[recipientFilter]}</strong>
            </div>
          )}

          {(() => {
            const missingAgam = recipients.filter(
              i => (i.sender ?? 'agam') === 'agam'
            ).length > 0 && !tokenAgam
            const missingVania = recipients.filter(
              i => i.sender === 'vania'
            ).length > 0 && !tokenVania
            if (missingAgam || missingVania) return (
              <div style={{
                padding:'10px 14px',
                background:'#fff8ec',
                border:'0.5px solid #f0a500',
                borderRadius:8, fontSize:12,
                color:'#b8600a', marginBottom:10,
              }}>
                ⚠️ Token {missingAgam ? 'Managam' : ''}
                {missingAgam && missingVania ? ' dan ' : ''}
                {missingVania ? 'Vania' : ''} belum diisi —
                pesan ke tamu tersebut tidak akan terkirim.
              </div>
            )
            return null
          })()}

          <button
            onClick={send}
            disabled={sending || recipients.length===0}
            style={{
              padding:'16px', background:'#1e3d2a',
              color:'white', border:'none', borderRadius:12,
              fontFamily:'Cinzel,serif', fontSize:11,
              letterSpacing:3, cursor:'pointer',
              opacity: (sending||recipients.length===0)
                ? 0.6 : 1,
            }}
          >
            {sending
              ? `MENGIRIM...`
              : (() => {
                  const agam = recipients.filter(
                    i => (i.sender ?? 'agam') === 'agam'
                  ).length
                  const vania = recipients.filter(
                    i => i.sender === 'vania'
                  ).length
                  if (agam > 0 && vania > 0)
                    return `KIRIM ${agam} (Managam) + ${vania} (Vania)`
                  if (vania > 0)
                    return `KIRIM ${vania} PENERIMA (Vania)`
                  return `KIRIM ${agam} PENERIMA (Managam)`
                })()
            }
          </button>

          {result && (
            <div style={{
              padding:'16px', borderRadius:12,
              background: result.failed===0
                ? '#e8f5e9' : '#fff3e0',
              border: `0.5px solid ${
                result.failed===0 ? '#2d5a3d' : '#f0a500'
              }`,
              fontSize:14,
            }}>
              ✓ {result.sent} pesan terkirim
              {result.failed > 0 &&
                ` · ${result.failed} gagal`
              }
            </div>
          )}

          {log.length > 0 && (
            <div style={{
              background:'white', borderRadius:12,
              padding:'20px', border:'0.5px solid #ede5d4',
            }}>
              <div style={{
                fontFamily:'Cinzel,serif', fontSize:10,
                letterSpacing:3, color:'#6b8f71',
                marginBottom:12,
              }}>RIWAYAT</div>
              {log.map((l, i) => (
                <div key={i} style={{
                  fontSize:13, color:'#888',
                  marginBottom:6, padding:'6px 0',
                  borderBottom:'0.5px solid #f0ece4',
                }}>
                  {l.time} · {l.count} pesan · {l.status}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
