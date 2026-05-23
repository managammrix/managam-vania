'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, fetchAllWishes, fetchMessageLog } from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

interface Stats {
  total_invitees: number
  rsvp_confirmed: number
  attending: number
  not_attending: number
  pending: number
  wishes_total: number
  wishes_pending: number
  honored_count: number
  total_seats: number
  reminder_sent: boolean
  h7_sent: boolean
}

export default function AdminDashboard() {
  useAdminAuth()
  const [stats, setStats] = useState<Stats>({
    total_invitees:0, rsvp_confirmed:0,
    attending:0, not_attending:0, pending:0,
    wishes_total:0, wishes_pending:0,
    honored_count:0, total_seats:0,
    reminder_sent:false, h7_sent:false,
  })

  useEffect(() => {
    const load = async () => {
      const [inv, wsh, logs] = await Promise.all([
        fetchInvitees().catch(() => []),
        fetchAllWishes().catch(() => []),
        fetchMessageLog().catch(() => []),
      ])

      setStats({
        total_invitees: inv.length,
        rsvp_confirmed: inv.filter(i =>
          i.rsvp_status === 'confirmed'
        ).length,
        attending: inv.filter(i => i.attending).length,
        not_attending: inv.filter(i =>
          i.attending === false
        ).length,
        pending: inv.filter(i =>
          i.rsvp_status === 'pending'
        ).length,
        wishes_total: wsh.length,
        wishes_pending: wsh.filter(w => !w.approved).length,
        honored_count: inv.filter(i => i.guests === 0).length,
        total_seats: inv.filter(i =>
          i.attending !== false
        ).reduce((sum, i) => sum + (i.guests ?? 1), 0),
        reminder_sent: logs.some(l =>
          l.message?.includes('/u/reminder') &&
          l.sent_at !== null &&
          new Date(l.sent_at) > new Date('2026-06-07T02:00:00Z')
        ),
        h7_sent: logs.some(l =>
          l.message?.includes('/u/h7') &&
          l.sent_at !== null &&
          new Date(l.sent_at) > new Date('2026-06-13T02:00:00Z')
        ),
      })
    }
    load()
  }, [])

  const cards = [
    { label:'Total Tamu',
      value:stats.total_invitees, color:'#1e3d2a' },
    { label:'Konfirmasi Hadir',
      value:stats.attending, color:'#2d5a3d' },
    { label:'Total Kursi',
      value:stats.total_seats, color:'#2d5a3d' },
    { label:'Belum RSVP',
      value:stats.pending, color:'#f0a500' },
    { label:'Tidak Hadir',
      value:stats.not_attending, color:'#c0392b' },
    { label:'Tamu Kehormatan',
      value:stats.honored_count, color:'#d4881a' },
    { label:'Ucapan Masuk',
      value:stats.wishes_total, color:'#2d5a3d' },
    { label:'Ucapan Pending',
      value:stats.wishes_pending, color:'#b8965a' },
  ]

  return (
    <div>
      <h1 style={{
        fontFamily:'Cormorant Garamond,serif',
        fontSize:32, fontStyle:'italic',
        color:'#1e3d2a', marginBottom:8,
      }}>Dashboard</h1>
      <p style={{
        fontSize:13, color:'#888', marginBottom:32,
      }}>Managam & Vania · 20 Juni 2026</p>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
        gap:16,
      }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background:'white', borderRadius:12,
            padding:'24px 20px',
            border:'0.5px solid #ede5d4',
          }}>
            <div style={{
              fontSize:13, color:'#888', marginBottom:8,
            }}>{card.label}</div>
            <div style={{
              fontSize:36, fontWeight:500,
              color:card.color, lineHeight:1,
            }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:24,
        background:'white',
        borderRadius:12,
        padding:'20px 24px',
        border:'0.5px solid #ede5d4',
      }}>
        <div style={{
          fontFamily:'Cinzel,serif',
          fontSize:10, letterSpacing:3,
          color:'#6b8f71', marginBottom:16,
        }}>JADWAL OTOMATIS</div>

        {[
          {
            name: 'Reminder RSVP',
            date: '7 Juni 2026 · 09:00 WIB',
            target: 'Tamu belum RSVP',
            template: 'Reminder RSVP (Sedang)',
            fired: stats.reminder_sent,
          },
          {
            name: 'H-7 Blast',
            date: '13 Juni 2026 · 09:00 WIB',
            target: 'Tamu konfirmasi hadir',
            template: 'H-7 (Sedang)',
            fired: stats.h7_sent,
          },
        ].map(job => (
          <div key={job.name} style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            padding:'12px 0',
            borderBottom:'0.5px solid #f0ece4',
            fontSize:13,
          }}>
            <div>
              <div style={{
                fontWeight:500,
                color:'#1e3d2a',
                marginBottom:2,
              }}>{job.name}</div>
              <div style={{color:'#888', fontSize:12}}>
                {job.date} · {job.target}
              </div>
              <div style={{
                color:'#aaa', fontSize:11,
                fontFamily:'Cinzel,serif',
                letterSpacing:1,
              }}>{job.template}</div>
            </div>
            <span style={{
              padding:'3px 10px',
              borderRadius:6,
              fontSize:11,
              background: job.fired ? '#e8f5e9' : '#fff8ec',
              color: job.fired ? '#2d5a3d' : '#f0a500',
              fontWeight:500,
              flexShrink:0,
            }}>
              {job.fired ? 'TERKIRIM' : 'TERJADWAL'}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:24, padding:'24px',
        background:'white', borderRadius:12,
        border:'0.5px solid #ede5d4',
      }}>
        <h2 style={{
          fontFamily:'Cinzel,serif', fontSize:11,
          letterSpacing:3, color:'#6b8f71',
          marginBottom:16,
        }}>COUNTDOWN</h2>
        <p style={{
          fontFamily:'Cormorant Garamond,serif',
          fontSize:24, fontStyle:'italic',
          color:'#1e3d2a',
        }}>
          {Math.max(0, Math.ceil(
            (new Date('2026-06-20').getTime() -
             Date.now()) / (1000*60*60*24)
          ))} hari menuju hari pernikahan
        </p>
      </div>
    </div>
  )
}
