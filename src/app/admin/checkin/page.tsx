'use client'
import { useEffect, useState } from 'react'
import { fetchInvitees, InviteeRow } from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

export default function AdminCheckinPage() {
  useAdminAuth()
  const [invitees, setInvitees] = useState<InviteeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'checked' | 'pending' | 'souvenir' | 'lunchbox'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchInvitees()
      setInvitees(data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  const confirmed = invitees.filter(i => i.rsvp_status === 'confirmed')
  const expectedSeats = confirmed.reduce((s, i) => s + (i.guests ?? 1), 0)
  const checkedIn = confirmed.filter(i => i.checked_in_at)
  const checkedSeats = checkedIn.reduce((s, i) => s + (i.guests ?? 1), 0)
  const souvenirsClaimed = confirmed.filter(i => i.souvenir_claimed).length
  const lunchboxesClaimed = confirmed.filter(i => i.lunchbox_claimed).length

  const filtered = confirmed.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.ref ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'checked' ? !!i.checked_in_at :
      filter === 'pending' ? !i.checked_in_at :
      filter === 'souvenir' ? !!i.souvenir_claimed :
      filter === 'lunchbox' ? !!i.lunchbox_claimed :
      true
    return matchSearch && matchFilter
  })

  const sortedRecent = [...checkedIn]
    .sort((a, b) => (b.checked_in_at ?? '').localeCompare(a.checked_in_at ?? ''))
    .slice(0, 10)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <h1 style={{
          fontFamily: 'Cormorant Garamond,serif',
          fontSize: 32, fontStyle: 'italic', color: '#1e3d2a',
        }}>Check-in Hari H</h1>
        <button
          onClick={load}
          style={{
            padding: '8px 16px', borderRadius: 8,
            border: '0.5px solid #d9cdb8',
            background: 'white', cursor: 'pointer',
            fontFamily: 'Cinzel,serif', fontSize: 10,
            letterSpacing: 2, color: '#1e3d2a',
          }}
        >REFRESH</button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        marginBottom: 24,
      }}>
        <Stat label="Tamu Diharapkan" value={confirmed.length} sub={`${expectedSeats} kursi`} />
        <Stat label="Sudah Check-in" value={checkedIn.length} sub={`${checkedSeats} kursi`} color="#2d5a3d" />
        <Stat label="Souvenir Diserahkan" value={souvenirsClaimed} sub={`dari ${confirmed.length}`} color="#b8965a" />
        <Stat label="Lunchbox Diserahkan" value={lunchboxesClaimed} sub={`dari ${confirmed.length}`} color="#993556" />
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'white', borderRadius: 12, padding: 20,
        border: '0.5px solid #ede5d4', marginBottom: 24,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 8, fontSize: 12, color: '#888',
        }}>
          <span>Progress Check-in</span>
          <span>{confirmed.length > 0
            ? Math.round((checkedIn.length / confirmed.length) * 100)
            : 0}%</span>
        </div>
        <div style={{
          height: 12, borderRadius: 6,
          background: '#f0ece4', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: confirmed.length > 0
              ? `${(checkedIn.length / confirmed.length) * 100}%`
              : '0%',
            background: 'linear-gradient(90deg, #2d5a3d, #6b8f71)',
            transition: 'width 0.4s',
          }} />
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr',
        gap: 24,
      }}>
        {/* Guest list */}
        <div style={{
          background: 'white', borderRadius: 12,
          border: '0.5px solid #ede5d4', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #ede5d4' }}>
            <input
              placeholder="Cari nama atau ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px',
                border: '0.5px solid #d9cdb8', borderRadius: 8,
                fontSize: 14, outline: 'none', marginBottom: 10,
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'checked', 'pending', 'souvenir', 'lunchbox'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 12px', borderRadius: 6,
                    border: '0.5px solid #d9cdb8',
                    background: filter === f ? '#1e3d2a' : 'white',
                    color: filter === f ? 'white' : '#888',
                    fontSize: 11, cursor: 'pointer',
                    fontFamily: 'Cinzel,serif', letterSpacing: 1,
                  }}>
                  {f === 'all' ? 'SEMUA' :
                    f === 'checked' ? `HADIR (${checkedIn.length})` :
                    f === 'pending' ? `BELUM (${confirmed.length - checkedIn.length})` :
                    f === 'souvenir' ? `SOUVENIR (${souvenirsClaimed})` :
                    `LUNCHBOX (${lunchboxesClaimed})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p style={{ padding: 24, color: '#888', fontSize: 14 }}>Memuat...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f7f4', borderBottom: '0.5px solid #ede5d4' }}>
                  {['Nama', 'Tamu', 'Check-in', 'Souvenir', 'Lunchbox'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontFamily: 'Cinzel,serif', fontSize: 10,
                      letterSpacing: 2, color: '#6b8f71', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '0.5px solid #f0ece4' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {inv.name}
                      <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>
                        {inv.ref}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{inv.guests ?? 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {inv.checked_in_at
                        ? <span style={pill('#e8f5e9', '#2d5a3d')}>
                            ✓ {new Date(inv.checked_in_at).toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        : <span style={{ color: '#aaa', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {inv.souvenir_claimed
                        ? <span style={pill('#fff8ec', '#b8965a')}>✓</span>
                        : <span style={{ color: '#aaa', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {inv.lunchbox_claimed
                        ? <span style={pill('#fbeaf0', '#993556')}>✓</span>
                        : <span style={{ color: '#aaa', fontSize: 11 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>
              Tidak ada tamu yang cocok.
            </p>
          )}
        </div>

        {/* Recent activity */}
        <div style={{
          background: 'white', borderRadius: 12,
          padding: 20, border: '0.5px solid #ede5d4',
          height: 'fit-content',
        }}>
          <div style={{
            fontFamily: 'Cinzel,serif', fontSize: 10,
            letterSpacing: 3, color: '#6b8f71', marginBottom: 14,
          }}>10 CHECK-IN TERAKHIR</div>
          {sortedRecent.length === 0 ? (
            <p style={{ fontSize: 12, color: '#aaa' }}>Belum ada check-in</p>
          ) : sortedRecent.map(inv => (
            <div key={inv.id} style={{
              padding: '10px 0',
              borderBottom: '0.5px solid #f0ece4',
              fontSize: 13,
            }}>
              <div style={{ fontWeight: 500 }}>{inv.name}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {inv.checked_in_at
                  ? new Date(inv.checked_in_at).toLocaleString('id')
                  : ''}
                {' · '}{inv.guests ?? 1} tamu
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, color = '#1e3d2a' }: {
  label: string
  value: number
  sub: string
  color?: string
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: 20, border: '0.5px solid #ede5d4',
    }}>
      <div style={{
        fontFamily: 'Cinzel,serif', fontSize: 9,
        letterSpacing: 2, color: '#6b8f71',
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: 'Cormorant Garamond,serif',
        fontSize: 42, fontStyle: 'italic',
        color, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: 11, color: '#aaa', marginTop: 6,
      }}>{sub}</div>
    </div>
  )
}

function pill(bg: string, color: string): React.CSSProperties {
  return {
    padding: '2px 8px', borderRadius: 4,
    fontSize: 11, fontWeight: 500,
    background: bg, color,
  }
}
