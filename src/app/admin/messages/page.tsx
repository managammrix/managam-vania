'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, logMessage, InviteeRow }
  from '@/lib/supabase'
import { sendBulkWhatsApp } from '@/lib/fonnte'
import { useAdminAuth } from '@/lib/adminAuth'

const RECOMMENDED_TEMPLATE: Record<string,string> = {
  pending:  'Undangan Awal',
  confirmed: 'H-7',
  honored:  'Tamu Kehormatan',
  all:      '',
}

const TEMPLATES = [
  {
    label: 'Undangan Awal',
    message: `Syalom, {name}! 🌿\n\nPuji Tuhan — Ia yang telah memulai pekerjaan yang baik ini, Ia pula yang menyelesaikannya! 🙌\n\nDengan penuh sukacita dan ucapan syukur atas kesetiaan Tuhan, kami ingin bersaksi:\n\n*Tuhan telah menetapkan waktu-Nya* — dan kami akan melangsungkan Pernikahan Kudus kami:\n\n✝️ *Managam Raja Silalahi, S.Kom., M.Sc.*\n    Putra Bapak Saut Silalahi & Ibu Erna Sitinjak, S.K.M.\n\nbersama\n\n🌸 *Vania, S.Psi.*\n    Putri Bapak Pdt. Fredi (Tee Tjien Hian), S.Th. & Ibu Tan Tjoen Nio\n\n📅 *Sabtu, 20 Juni 2026*\n⛪ GMS Central Park – Hall B\n    Jl. Letjen S. Parman No. Kav. 28, Jakarta Barat\n🕙 Pukul 10:00 – 12:00 WIB\n\nKami mengundang Bapak/Ibu/Saudara/i *{name}* untuk hadir menjadi saksi atas karya Tuhan dalam hidup kami dan turut bersukacita bersama kami pada hari yang penuh berkat ini.\n\n_"For I know the plans I have for you, declares the Lord — plans to prosper you and not to harm you, plans to give you hope and a future."_\n— Jeremiah 29:11\n\nMohon konfirmasi kehadiran:\n🔗 https://managamvania.mrix.ai/u/awal\n\n*#BuildingMANAGAMVANturesWithGod* 🙏\nTuhan Yesus memberkati Bapak/Ibu/Saudara/i!\n\nDengan kasih dalam Kristus,\n*Managam & Vania*`,
  },
  {
    label: 'Reminder RSVP',
    message: `Syalom, {name}! 🌿\n\nKiranya damai sejahtera Tuhan menyertai Bapak/Ibu/Saudara/i hari ini 🙏\n\nKami mengingatkan dengan penuh kasih bahwa *konfirmasi kehadiran* pernikahan kami ditutup pada *14 Juni 2026*.\n\nKami percaya Tuhan sudah menetapkan siapa yang akan menjadi saksi pada hari bersejarah dalam hidup kami ini 🙌\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nMohon konfirmasi kehadiran di:\n🔗 https://managamvania.mrix.ai/u/reminder\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nTerima kasih atas doa dan kasih Bapak/Ibu/Saudara/i 🙏\n\n*Tuhan memberkati!*\nManagam & Vania`,
  },
  {
    label: 'H-7',
    message: `Syalom, {name}! 🌿🎉\n\n*Haleluya — tinggal 7 hari lagi!*\n\nKami bersukacita dan memuliakan Tuhan atas kesetiaan-Nya yang luar biasa dalam perjalanan panjang ini. Ia yang memulai, Ia yang menyelesaikan! 🙌\n\nKami sangat menantikan kehadiran dan doa restu Bapak/Ibu/Saudara/i pada:\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nDetail lengkap undangan:\n🔗 https://managamvania.mrix.ai/u/h7\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nSampai berjumpa di hari yang penuh kemuliaan-Nya!\n*#BuildingMANAGAMVANturesWithGod* 🙏\n\nTuhan Yesus memberkati!\n*Managam & Vania*`,
  },
  {
    label: 'Tamu Kehormatan',
    message: `Syalom, {name}! 🌿\n\nKiranya kasih karunia dan damai sejahtera Tuhan Yesus Kristus menyertai Bapak/Ibu/Saudara/i 🙏\n\nDengan penuh hormat dan kasih dalam Kristus, kami ingin berbagi kabar sukacita ini:\n\n*Puji Tuhan — Ia telah menuntun perjalanan kami hingga pada hari yang telah Ia tetapkan.*\n\nKami akan melangsungkan Pernikahan Kudus kami pada *Sabtu, 20 Juni 2026* di Jakarta.\n\nKami memahami bahwa jarak dan situasi mungkin tidak memungkinkan kehadiran fisik Bapak/Ibu/Saudara/i — namun kami percaya *doa dan restu Anda adalah kekuatan* bagi kami.\n\nKiranya Anda turut bersukacita bersama kami dari jauh dan mengangkat kami dalam doa 🙌\n\nDetail undangan digital:\n🔗 https://managamvania.mrix.ai/u/hormat\n\n_"I press on toward the goal for the prize of the upward call of God in Christ Jesus."_\n— Philippians 3:14\n\nSalam dalam kasih Kristus Yesus,\n*Managam & Vania*\n*#BuildingMANAGAMVANturesWithGod*`,
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
    if (saved) setToken(saved)
  }, [])

  const recipients = invitees.filter(i => {
    if (recipientFilter === 'pending')
      return i.rsvp_status === 'pending'
    if (recipientFilter === 'confirmed')
      return i.attending === true
    if (recipientFilter === 'honored')
      return i.guests === 0
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
           !message.startsWith(
             TEMPLATES.find(t =>
               t.label === RECOMMENDED_TEMPLATE[recipientFilter]
             )?.message.slice(0, 20) ?? '___'
           ) && (
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
