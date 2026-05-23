'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, logMessage, InviteeRow }
  from '@/lib/supabase'
import { sendBulkWhatsApp } from '@/lib/fonnte'
import { useAdminAuth } from '@/lib/adminAuth'

const TEMPLATES = [
  {
    label: 'Undangan awal',
    message: `Shalom, {name} 🌿\n\nDengan penuh syukur kepada Tuhan Yang Maha Baik, kami mengumumkan bahwa kami akan melangsungkan Pernikahan Kudus kami:\n\n✝️ *Managam Raja Silalahi, S.Kom., M.Sc.*\n   Putra Bapak Saut Silalahi & Ibu Erna Sitinjak\n\nbersama\n\n🌸 *Vania, S.Psi.*\n   Putri Bapak Pdt. Fredi (Tee Tjien Hian), S.Th. & Ibu Tan Tjoen Nio\n\n📅 Sabtu, 20 Juni 2026\n⛪ GMS Central Park – Hall B, Jakarta Barat\n🕙 Pukul 10:00 – 12:00 WIB\n\nDengan rendah hati kami mengundang Bapak/Ibu/Saudara/i *{name}* untuk hadir memberikan doa restu bagi kami.\n\nMohon konfirmasi kehadiran melalui:\n🔗 https://managamvania.mrix.ai?utm_source=whatsapp_blast&utm_medium=whatsapp&utm_campaign=undangan_awal\n\n*#BuildingMANAGAMVANturesWithGod*\nTuhan memberkati 🙏`,
  },
  {
    label: 'Reminder RSVP',
    message: `Shalom, {name} 🌿\n\nKami mengingatkan dengan hormat bahwa konfirmasi kehadiran pernikahan kami ditutup pada *14 Juni 2026*.\n\nKiranya Tuhan memampukan Bapak/Ibu/Saudara/i untuk hadir bersama kami pada:\n\n📅 Sabtu, 20 Juni 2026 · 10:00 WIB\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nMohon konfirmasi di:\n🔗 https://managamvania.mrix.ai?utm_source=whatsapp_blast&utm_medium=whatsapp&utm_campaign=reminder_rsvp\n\nTerima kasih atas doa dan kasih Anda 🙏\nManagam & Vania`,
  },
  {
    label: 'H-7',
    message: `Shalom, {name} 🌿\n\nTinggal *7 hari* lagi menuju hari yang kami nantikan bersama Tuhan 🎉\n\nKami sangat bersukacita dan menantikan kehadiran Bapak/Ibu/Saudara/i pada:\n\n📅 Sabtu, 20 Juni 2026 · 10:00 WIB\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nDetail lengkap:\n🔗 https://managamvania.mrix.ai?utm_source=whatsapp_blast&utm_medium=whatsapp&utm_campaign=h7_reminder\n\nSampai jumpa di hari yang penuh berkat!\n*#BuildingMANAGAMVANturesWithGod* 🙏\nManagam & Vania`,
  },
  {
    label: 'Tamu Kehormatan',
    message: `Shalom, {name} 🌿\n\nDengan penuh hormat dan kasih, kami ingin berbagi kabar sukacita ini:\n\nPuji Tuhan, kami akan melangsungkan Pernikahan Kudus kami pada:\n\n📅 Sabtu, 20 Juni 2026\n📍 Jakarta\n\nKami memahami jarak dan kesibukan Bapak/Ibu/Saudara/i, namun kami ingin Anda mengetahui momen bersejarah ini dan memohon doa restu Anda dari jauh.\n\nDetail undangan:\n🔗 https://managamvania.mrix.ai?utm_source=whatsapp_blast&utm_medium=whatsapp&utm_campaign=tamu_kehormatan\n\nDoa dan kasih Anda adalah berkat terbesar bagi kami 🙏\n\nSalam dalam kasih Kristus,\nManagam & Vania\n*#BuildingMANAGAMVANturesWithGod*`,
  },
  {
    label: 'Keluarga Inti',
    message: `Shalom, {name} 🌿\n\nDengan sukacita kami ingin memberitahu bahwa Pernikahan Kudus kami akan segera dilangsungkan:\n\n📅 Sabtu, 20 Juni 2026 · 10:00 WIB\n⛪ GMS Central Park – Hall B, Jakarta Barat\n\nDetail lengkap ada di undangan digital kami:\n🔗 https://managamvania.mrix.ai?utm_source=whatsapp_blast&utm_medium=whatsapp&utm_campaign=keluarga_inti\n\nSampai jumpa di hari yang penuh berkat! 🙏\nManagam & Vania\n*#BuildingMANAGAMVANturesWithGod*`,
  },
]

export default function MessagesPage() {
  useAdminAuth()
  const [invitees, setInvitees] = useState<InviteeRow[]>([])
  const [token, setToken] = useState('')
  const [message, setMessage] = useState(
    TEMPLATES[0].message
  )
  const [recipientFilter, setRecipientFilter] =
    useState<'all'|'pending'|'confirmed'|'honored'|'family'>('all')
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
    if (saved) setToken(saved)
  }, [])

  const recipients = invitees.filter(i => {
    if (recipientFilter === 'pending')
      return i.rsvp_status === 'pending' && !i.is_family
    if (recipientFilter === 'confirmed')
      return i.attending === true && !i.is_family
    if (recipientFilter === 'honored')
      return i.guests === 0
    if (recipientFilter === 'family')
      return i.is_family === true
    return true
  })

  const send = async () => {
    if (!token) {
      alert('Masukkan Fonnte API token dulu.')
      return
    }
    if (!message) return
    if (!confirm(
      `Kirim ke ${recipients.length} penerima?`
    )) return

    localStorage.setItem('fonnte_token', token)
    setSending(true)
    setResult(null)

    try {
      const res = await sendBulkWhatsApp(
        token, recipients, message
      )
      setResult(res)
      await logMessage({
        recipient_count: recipients.length,
        message,
        recipients: recipients,
        status: res.failed === 0 ? 'sent' : 'partial',
      })
      setLog(l => [{
        time: new Date().toLocaleTimeString('id'),
        count: res.sent,
        status: res.failed===0 ? 'Berhasil' :
          `${res.sent} berhasil, ${res.failed} gagal`,
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
            marginBottom:20,
          }}>
            {TEMPLATES.map(t => (
              <button key={t.label}
                onClick={() => setMessage(t.message)}
                style={{
                  padding:'6px 14px', borderRadius:6,
                  border:'0.5px solid #d9cdb8',
                  background: message===t.message
                    ? '#1e3d2a' : 'white',
                  color: message===t.message
                    ? 'white' : '#888',
                  fontSize:12, cursor:'pointer',
                }}>{t.label}</button>
            ))}
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
            }}>FONNTE API TOKEN</div>
            <input
              type="password"
              placeholder="Token dari fonnte.com"
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{
                width:'100%', padding:'10px 12px',
                border:'0.5px solid #d9cdb8', borderRadius:8,
                fontSize:14, outline:'none',
              }}
            />
            <p style={{
              fontSize:11, color:'#aaa', marginTop:6,
            }}>
              Disimpan di browser. Tidak dikirim ke server.
            </p>
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
            {(['all','pending','confirmed','honored','family'] as const).map(f => (
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
                    i=>i.rsvp_status==='pending' && !i.is_family
                  ).length})` :
                 f==='confirmed' ?
                  `Konfirmasi hadir (${invitees.filter(
                    i=>i.attending && !i.is_family
                  ).length})` :
                 f==='honored' ?
                  `Tamu Kehormatan (${invitees.filter(
                    i=>i.guests===0
                  ).length})` :
                  `Keluarga Inti (${invitees.filter(
                    i=>i.is_family
                  ).length})`
                }
              </label>
            ))}
          </div>

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
            {sending ?
              `MENGIRIM... (${recipients.length} pesan)` :
              `KIRIM KE ${recipients.length} PENERIMA`
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
