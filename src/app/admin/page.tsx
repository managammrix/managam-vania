'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, fetchAllWishes } from '@/lib/supabase'
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
  lunchboxes: number
  souvenirs: number
  lunchboxes_claimed: number
  souvenirs_claimed: number
}

export default function AdminDashboard() {
  useAdminAuth()
  const [stats, setStats] = useState<Stats>({
    total_invitees:0, rsvp_confirmed:0,
    attending:0, not_attending:0, pending:0,
    wishes_total:0, wishes_pending:0,
    honored_count:0, total_seats:0,
    lunchboxes:0, souvenirs:0,
    lunchboxes_claimed:0, souvenirs_claimed:0,
  })

  useEffect(() => {
    const load = async () => {
      const [inv, wsh] = await Promise.all([
        fetchInvitees().catch(() => []),
        fetchAllWishes().catch(() => []),
      ])

      // Catering prep — mirrors the check-in page conventions
      // (rsvp_status === 'confirmed', seats = sum of guests, default 1).
      // Tamu Kehormatan (guests === 0) get neither lunch box nor souvenir:
      // they add 0 seats automatically, and are excluded from souvenirs via
      // `guests !== 0`.
      const confirmed = inv.filter(i => i.rsvp_status === 'confirmed')

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
        // 🍱 1 lunch box per confirmed seat (honored guests=0 add nothing).
        lunchboxes: confirmed.reduce((s, i) => s + (i.guests ?? 1), 0),
        // 🎁 1 souvenir per confirmed invitation, excluding Tamu Kehormatan.
        souvenirs: confirmed.filter(i => i.guests !== 0).length,
        // Seat-accurate claimed lunch boxes (sum of guests for parties that
        // claimed) — NOT a per-party count — so claimed/expected are directly
        // comparable on the dashboard. (Check-in's own card counts parties.)
        lunchboxes_claimed: confirmed
          .filter(i => i.lunchbox_claimed)
          .reduce((s, i) => s + (i.guests ?? 1), 0),
        souvenirs_claimed: confirmed
          .filter(i => i.souvenir_claimed && i.guests !== 0).length,
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

      <div className="admin-grid-4col" style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
        gap:16,
      }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background:'white', borderRadius:12,
            padding:'20px 16px',
            border:'0.5px solid #ede5d4',
          }}>
            <div className="admin-stat-label-mobile" style={{
              fontSize:13, color:'#888', marginBottom:8,
            }}>{card.label}</div>
            <div className="admin-stat-font-mobile" style={{
              fontSize:36, fontWeight:500,
              color:card.color, lineHeight:1,
            }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:40, padding:'24px',
        background:'white', borderRadius:12,
        border:'0.5px solid #ede5d4',
      }}>
        <h2 style={{
          fontFamily:'Cinzel,serif', fontSize:11,
          letterSpacing:3, color:'#6b8f71',
          marginBottom:16,
        }}>PERSIAPAN KATERING</h2>
        <div className="admin-grid-4col" style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
          gap:16,
        }}>
          {[
            { label:'🍱 Lunch Box', value:stats.lunchboxes,
              claimed:stats.lunchboxes_claimed, color:'#993556' },
            { label:'🎁 Souvenir', value:stats.souvenirs,
              claimed:stats.souvenirs_claimed, color:'#b8965a' },
          ].map(card => (
            <div key={card.label} style={{
              background:'#faf7f0', borderRadius:12,
              padding:'20px 16px',
              border:'0.5px solid #ede5d4',
            }}>
              <div className="admin-stat-label-mobile" style={{
                fontSize:13, color:'#888', marginBottom:8,
              }}>{card.label}</div>
              <div className="admin-stat-font-mobile" style={{
                fontSize:36, fontWeight:500,
                color:card.color, lineHeight:1,
              }}>{card.value}</div>
              <div style={{
                fontSize:12, color:'#aaa', marginTop:8,
              }}>Diambil {card.claimed} / {card.value}</div>
            </div>
          ))}
        </div>
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
