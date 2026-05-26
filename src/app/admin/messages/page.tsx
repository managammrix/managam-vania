'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, logMessage, InviteeRow }
  from '@/lib/supabase'
import { sendBulkWhatsApp } from '@/lib/fonnte'
import { useAdminAuth } from '@/lib/adminAuth'
import { TEMPLATES, Template } from '@/lib/templates'

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
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template>(TEMPLATES[0])
  const [editedTemplates, setEditedTemplates] =
    useState<Record<string, string>>({})
  const [recipientFilter, setRecipientFilter] =
    useState<'all'|'pending'|'confirmed'|'honored'>('all')
  const [manualSearch, setManualSearch] = useState('')
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    sent:number; failed:number
    agam: { sent:number; failed:number }
    vania: { sent:number; failed:number }
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
    const savedEdits = localStorage.getItem('mv_template_edits')
    if (savedEdits) {
      try {
        setEditedTemplates(JSON.parse(savedEdits))
      } catch {}
    }
  }, [])

  const currentKey = selectedTemplate.label
  const currentMessage =
    editedTemplates[currentKey] ?? selectedTemplate.message
  const isEdited =
    editedTemplates[currentKey] !== undefined &&
    editedTemplates[currentKey] !== selectedTemplate.message

  const selectTemplate = (tmpl: Template) => {
    setSelectedTemplate(tmpl)
  }

  const updateMessage = (val: string) => {
    const newEdits = { ...editedTemplates, [currentKey]: val }
    setEditedTemplates(newEdits)
    localStorage.setItem(
      'mv_template_edits',
      JSON.stringify(newEdits)
    )
  }

  const resetCurrent = () => {
    const newEdits = { ...editedTemplates }
    delete newEdits[currentKey]
    setEditedTemplates(newEdits)
    localStorage.setItem(
      'mv_template_edits',
      JSON.stringify(newEdits)
    )
  }

  const resetAll = () => {
    if (!confirm('Reset semua template ke versi asli?')) return
    setEditedTemplates({})
    localStorage.removeItem('mv_template_edits')
  }

  const manualMode = manualIds.size > 0
  const searchQ = manualSearch.trim().toLowerCase()
  // Search by name (case-insensitive) OR phone (digits/raw substring).
  // Cap to 50 results so the dropdown stays usable.
  const searchResults: InviteeRow[] = searchQ
    ? invitees
        .filter(i =>
          i.name.toLowerCase().includes(searchQ) ||
          (i.phone ?? '').toLowerCase().includes(searchQ)
        )
        .slice(0, 50)
    : []

  const toggleManualId = (id: string) => {
    setManualIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const clearManual = () => {
    setManualIds(new Set())
    setManualSearch('')
  }

  const recipients: InviteeRow[] = manualMode
    // Manual override — exactly the rows the user ticked, untouched
    // by the radio filter. Phone-less rows are still dropped at send
    // time in `sendable` below.
    ? invitees.filter(i => !!i.id && manualIds.has(i.id))
    : invitees.filter(i => {
        if (recipientFilter === 'honored')
          return i.guests === 0
        // For every non-honored bucket, defensively exclude:
        //  - honored guests (guests=0) — they have their own template/bucket
        //  - explicit declines (rsvp_status='declined')
        // so an accidental filter mismatch can never blast them.
        if (i.guests === 0) return false
        if (i.rsvp_status === 'declined') return false
        if (recipientFilter === 'pending')
          return i.rsvp_status === 'pending'
        if (recipientFilter === 'confirmed')
          return i.attending === true
        return true
      })

  const send = async () => {
    if (!tokenAgam && !tokenVania) {
      alert('Masukkan minimal satu Fonnte token.')
      return
    }
    if (!currentMessage) return
    if (!confirm(
      `Kirim ke ${recipients.length} penerima?`
    )) return

    setSending(true)
    setResult(null)

    // Only invitees with a phone number can receive WhatsApp.
    // Physical anonymous slots (phone=null) are skipped.
    const sendable = recipients.filter(i => !!i.phone)
    const agamRecipients = sendable.filter(
      i => (i.sender ?? 'agam') === 'agam'
    )
    const vaniaRecipients = sendable.filter(
      i => i.sender === 'vania'
    )

    console.log('[blast] agam recipients:', agamRecipients.length)
    console.log('[blast] vania recipients:', vaniaRecipients.length)
    console.log('[blast] tokenAgam present:', !!tokenAgam, 'length:', tokenAgam.length)
    console.log('[blast] tokenVania present:', !!tokenVania, 'length:', tokenVania.length)
    console.log('[blast] vania sample recipient:', vaniaRecipients[0])

    try {
      const [agamResult, vaniaResult] = await Promise.all([
        agamRecipients.length > 0 && tokenAgam
          ? sendBulkWhatsApp(
              tokenAgam,
              agamRecipients.map(i => ({
                name: i.name, phone: i.phone!, ref: i.ref,
              })),
              currentMessage
            ).catch(err => {
              console.error('[blast] agam error:', err)
              return { sent: 0, failed: agamRecipients.length }
            })
          : Promise.resolve({ sent: 0, failed: 0 }),
        vaniaRecipients.length > 0 && tokenVania
          ? sendBulkWhatsApp(
              tokenVania,
              vaniaRecipients.map(i => ({
                name: i.name, phone: i.phone!, ref: i.ref,
              })),
              currentMessage
            ).catch(err => {
              console.error('[blast] vania error:', err)
              return { sent: 0, failed: vaniaRecipients.length }
            })
          : Promise.resolve({ sent: 0, failed: 0 }),
      ])

      const totalSent = agamResult.sent + vaniaResult.sent
      const totalFailed = agamResult.failed + vaniaResult.failed

      console.log('[blast] agam result:', agamResult)
      console.log('[blast] vania result:', vaniaResult)

      setResult({
        sent: totalSent,
        failed: totalFailed,
        agam: agamResult,
        vania: vaniaResult,
      })

      await logMessage({
        recipient_count: totalSent,
        message: currentMessage,
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
            display:'flex', gap:6, marginTop:12,
            marginBottom:16,
          }}>
            <span style={{
              fontSize:11, color:'#aaa',
              alignSelf:'center',
            }}>
              {currentMessage.length} karakter
            </span>
          </div>

          <div style={{
            display:'flex', alignItems:'center',
            justifyContent:'space-between',
            marginBottom:8,
          }}>
            <span style={{
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:3, color:'#6b8f71',
            }}>PESAN</span>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              {isEdited && (
                <span style={{
                  fontSize:10, color:'#2d5a3d',
                  fontFamily:'Cinzel,serif',
                  letterSpacing:1,
                }}>✓ DIEDIT</span>
              )}
              {isEdited && (
                <button
                  onClick={resetCurrent}
                  style={{
                    padding:'4px 10px',
                    border:'0.5px solid #f5c6c6',
                    borderRadius:6, background:'white',
                    fontSize:10, cursor:'pointer',
                    color:'#c0392b',
                    fontFamily:'Cinzel,serif',
                    letterSpacing:1,
                  }}
                >RESET</button>
              )}
            </div>
          </div>
          <textarea
            value={currentMessage}
            onChange={e => updateMessage(e.target.value)}
            rows={12}
            style={ta}
          />
          <p style={{
            fontSize:12, color:'#aaa', marginTop:6,
          }}>
            Gunakan {'{name}'} untuk nama penerima, {'{link}'} untuk link undangan
          </p>
          <button
            onClick={resetAll}
            style={{
              marginTop:8,
              padding:'6px 12px',
              border:'0.5px solid #f5c6c6',
              borderRadius:6, background:'white',
              fontSize:10, cursor:'pointer',
              color:'#c0392b',
              fontFamily:'Cinzel,serif',
              letterSpacing:1,
              width:'100%',
            }}
          >RESET SEMUA TEMPLATE</button>
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
              marginBottom:16,
            }}>FONNTE API TOKEN</div>

            {/* Managam token */}
            <div style={{marginBottom:16}}>
              <label style={{
                fontFamily:'Cinzel,serif', fontSize:9,
                letterSpacing:2, color:'#2d5a3d',
                display:'block', marginBottom:6,
              }}>MANAGAM</label>
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
                  outline:'none',
                }}
              />
              <div style={{
                display:'flex', justifyContent:'space-between',
                marginTop:4,
              }}>
                <p style={{fontSize:11, color:'#aaa'}}>
                  Untuk tamu undangan Managam
                </p>
                {tokenAgam && (
                  <span style={{
                    fontSize:10, color:'#2d5a3d',
                    fontFamily:'Cinzel,serif', letterSpacing:1,
                  }}>✓ TERSIMPAN</span>
                )}
              </div>
            </div>

            {/* Vania token */}
            <div>
              <label style={{
                fontFamily:'Cinzel,serif', fontSize:9,
                letterSpacing:2, color:'#993556',
                display:'block', marginBottom:6,
              }}>VANIA</label>
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
                  outline:'none',
                }}
              />
              <div style={{
                display:'flex', justifyContent:'space-between',
                marginTop:4,
              }}>
                <p style={{fontSize:11, color:'#aaa'}}>
                  Untuk tamu undangan Vania
                </p>
                {tokenVania && (
                  <span style={{
                    fontSize:10, color:'#993556',
                    fontFamily:'Cinzel,serif', letterSpacing:1,
                  }}>✓ TERSIMPAN</span>
                )}
              </div>
            </div>
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
                gap:10, marginBottom:10, cursor: manualMode ? 'not-allowed' : 'pointer',
                fontSize:14, opacity: manualMode ? 0.45 : 1,
              }}>
                <input type="radio" name="filter"
                  disabled={manualMode}
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

            {/* ── Manual recipient picker ─────────────────────── */}
            <div style={{
              marginTop:14, paddingTop:14,
              borderTop:'0.5px solid #ede5d4',
            }} data-testid="manual-selector">
              <div style={{
                display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:8,
              }}>
                <span style={{
                  fontFamily:'Cinzel,serif', fontSize:10,
                  letterSpacing:2, color:'#6b8f71',
                }}>
                  PILIH MANUAL {manualMode && (
                    <span data-testid="manual-count" style={{color:'#1e3d2a'}}>
                      ({manualIds.size})
                    </span>
                  )}
                </span>
                {manualMode && (
                  <button
                    onClick={clearManual}
                    data-testid="manual-clear"
                    style={{
                      padding:'4px 10px',
                      border:'0.5px solid #f5c6c6',
                      borderRadius:6, background:'white',
                      fontSize:10, cursor:'pointer',
                      color:'#c0392b',
                      fontFamily:'Cinzel,serif', letterSpacing:1,
                    }}
                  >HAPUS PILIHAN</button>
                )}
              </div>
              <input
                type="text"
                placeholder="Cari nama atau nomor..."
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                data-testid="manual-search-input"
                style={{
                  width:'100%', padding:'9px 12px',
                  border:'0.5px solid #d9cdb8',
                  borderRadius:8, fontSize:13, outline:'none',
                }}
              />
              {searchQ && searchResults.length === 0 && (
                <div data-testid="manual-empty" style={{
                  marginTop:8, padding:'10px 12px',
                  fontSize:12, color:'#999',
                  background:'#faf6ec', borderRadius:6,
                  fontStyle:'italic',
                }}>
                  Tidak ada hasil untuk &quot;{manualSearch}&quot;
                </div>
              )}
              {searchResults.length > 0 && (
                <div data-testid="manual-results" style={{
                  marginTop:8, maxHeight:240, overflowY:'auto',
                  border:'0.5px solid #ede5d4', borderRadius:8,
                }}>
                  {searchResults.map(i => {
                    const checked = !!i.id && manualIds.has(i.id)
                    const noPhone = !i.phone
                    return (
                      <label
                        key={i.id ?? i.ref ?? i.name}
                        data-testid={`manual-result-${i.id ?? ''}`}
                        style={{
                          display:'flex', alignItems:'center', gap:10,
                          padding:'8px 12px',
                          borderBottom:'0.5px solid #f4eede',
                          cursor: i.id ? 'pointer' : 'not-allowed',
                          background: checked ? '#f4f7f0' : 'white',
                          fontSize:13,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!i.id}
                          onChange={() => i.id && toggleManualId(i.id)}
                          data-testid={`manual-checkbox-${i.id ?? ''}`}
                        />
                        <span style={{flex:1}}>{i.name}</span>
                        <span style={{
                          fontSize:11, color: noPhone ? '#c0392b' : '#888',
                        }}>
                          {noPhone ? '(tanpa nomor)' : i.phone}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
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

          <div style={{
            padding:'12px 14px',
            background:'#f0f7f1',
            border:'0.5px solid #6b8f71',
            borderRadius:8, fontSize:12,
            color:'#2d5a3d', marginBottom:12,
            lineHeight:1.6,
          }}>
            💡 Pesan akan dikirim otomatis:<br/>
            <strong>Token Managam</strong> → tamu dengan sender Managam<br/>
            <strong>Token Vania</strong> → tamu dengan sender Vania
          </div>

          <button
            onClick={send}
            disabled={sending || recipients.length===0}
            data-testid="kirim-button"
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
              display:'flex',
              flexDirection:'column',
              gap:6,
            }}>
              <div>
                ✓ {result.sent} pesan terkirim
                {result.failed > 0 &&
                  ` · ${result.failed} gagal`
                }
              </div>
              {(result.agam.sent > 0 || result.agam.failed > 0) && (
                <div style={{fontSize:12, color:'#2d5a3d'}}>
                  ↳ Managam: {result.agam.sent} terkirim
                  {result.agam.failed > 0 &&
                    ` · ${result.agam.failed} gagal`}
                </div>
              )}
              {(result.vania.sent > 0 || result.vania.failed > 0) && (
                <div style={{fontSize:12, color:'#993556'}}>
                  ↳ Vania: {result.vania.sent} terkirim
                  {result.vania.failed > 0 &&
                    ` · ${result.vania.failed} gagal`}
                </div>
              )}
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
