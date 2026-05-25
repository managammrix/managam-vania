'use client'
import { useEffect, useRef, useState } from 'react'
import {
  fetchInvitees,
  checkinByRef,
  claimSouvenirByRef,
  claimLunchboxByRef,
  updatePhysicalGuest,
  InviteeRow,
} from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

type Mode = 'search' | 'scan'

function isAnonPhysical(i: InviteeRow): boolean {
  const looksPhysical = i.name.startsWith('Undangan Fisik')
  if (i.type === 'physical') return looksPhysical
  if (i.type === undefined && looksPhysical) return true
  return false
}

export default function AdminCheckinPage() {
  useAdminAuth()
  const [invitees, setInvitees] = useState<InviteeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('search')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState<'all' | 'checked' | 'pending' | 'souvenir' | 'lunchbox'>('all')

  // Physical anon identification form state
  const [physName, setPhysName] = useState('')
  const [physPhone, setPhysPhone] = useState('')
  const [physGuests, setPhysGuests] = useState(1)

  // Scanner state
  const [scanError, setScanError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

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

  // ─── Scanner lifecycle ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'scan') {
      stopScanner()
      return
    }
    startScanner()
    return () => stopScanner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  async function startScanner() {
    setScanError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Kamera tidak tersedia — gunakan pencarian nama')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      tickScan()
    } catch (e) {
      console.error('[scan] camera error', e)
      setScanError('Kamera tidak tersedia — gunakan pencarian nama')
    }
  }

  function stopScanner() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function tickScan() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tickScan)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // Dynamically import jsQR (keeps initial bundle small for the
    // search-only path)
    const { default: jsQR } = await import('jsqr')
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })
    if (code) {
      handleScannedUrl(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tickScan)
  }

  function handleScannedUrl(raw: string) {
    let scannedRef: string | null = null
    try {
      const u = new URL(raw)
      scannedRef = u.searchParams.get('ref')
    } catch {
      // Maybe it's just the ref itself (no URL wrapper)
      if (/^[a-z0-9]{4,16}$/i.test(raw)) scannedRef = raw
    }
    if (!scannedRef) {
      setScanError(`QR tidak dikenali: ${raw.slice(0, 40)}`)
      rafRef.current = requestAnimationFrame(tickScan)
      return
    }
    const match = invitees.find(i => i.ref === scannedRef)
    if (!match) {
      setScanError(`Ref ${scannedRef} tidak ditemukan dalam daftar`)
      rafRef.current = requestAnimationFrame(tickScan)
      return
    }
    setSelectedId(match.id ?? null)
    setMode('search') // close scanner
  }

  // ─── Search filter ─────────────────────────────────────────────
  const searchHits = search.trim().length === 0
    ? []
    : invitees.filter(i => {
        const q = search.toLowerCase()
        return i.name.toLowerCase().includes(q) ||
          (i.phone ?? '').includes(search) ||
          (i.ref ?? '').toLowerCase().includes(q)
      }).slice(0, 12)

  const selected = invitees.find(i => i.id === selectedId) ?? null

  // ─── Actions ───────────────────────────────────────────────────
  const refreshAndKeepSelected = async () => {
    const data = await fetchInvitees()
    setInvitees(data)
  }

  const handleCheckin = async () => {
    if (!selected?.ref) return
    setActionBusy('checkin')
    setActionMsg(null)
    const res = await checkinByRef(selected.ref)
    setActionBusy(null)
    if (res.success) {
      setActionMsg(`✓ ${res.name} berhasil check-in`)
    } else if (res.already_checked_in) {
      setActionMsg(`⚠ ${res.name} sudah check-in sebelumnya`)
    } else {
      setActionMsg(`✗ ${res.error ?? 'Gagal check-in'}`)
    }
    await refreshAndKeepSelected()
  }

  const handleClaim = async (kind: 'souvenir' | 'lunchbox') => {
    if (!selected?.ref) return
    setActionBusy(kind)
    setActionMsg(null)
    const res = kind === 'souvenir'
      ? await claimSouvenirByRef(selected.ref)
      : await claimLunchboxByRef(selected.ref)
    setActionBusy(null)
    if (res.success) {
      setActionMsg(`✓ ${kind === 'souvenir' ? 'Souvenir' : 'Lunchbox'} diserahkan`)
    } else if (res.already_claimed) {
      setActionMsg(`⚠ Sudah pernah diserahkan`)
    } else {
      setActionMsg(`✗ ${res.error ?? 'Gagal'}`)
    }
    await refreshAndKeepSelected()
  }

  const handleIdentifyPhysical = async () => {
    if (!selected?.ref) return
    if (!physName.trim()) { alert('Masukkan nama tamu'); return }
    setActionBusy('identify')
    setActionMsg(null)
    const res = await updatePhysicalGuest(
      selected.ref, physName.trim(), physPhone.trim(), physGuests
    )
    setActionBusy(null)
    if (res.success) {
      setActionMsg(`✓ ${res.name} teridentifikasi & check-in`)
      setPhysName(''); setPhysPhone(''); setPhysGuests(1)
    } else {
      setActionMsg(`✗ ${res.error ?? 'Gagal'}`)
    }
    await refreshAndKeepSelected()
  }

  // Pre-fill physical form when selecting a new physical anon
  useEffect(() => {
    if (selected && isAnonPhysical(selected)) {
      setPhysGuests(selected.max_guests ?? selected.guests ?? 1)
    }
  }, [selected])

  // ─── Dashboard derived stats ──────────────────────────────────
  const confirmed = invitees.filter(i => i.rsvp_status === 'confirmed')
  const expectedSeats = confirmed.reduce((s, i) => s + (i.guests ?? 1), 0)
  const checkedIn = confirmed.filter(i => i.checked_in_at)
  const checkedSeats = checkedIn.reduce((s, i) => s + (i.guests ?? 1), 0)
  const souvenirsClaimed = confirmed.filter(i => i.souvenir_claimed).length
  const lunchboxesClaimed = confirmed.filter(i => i.lunchbox_claimed).length

  const tableRows = confirmed.filter(i => {
    if (tableFilter === 'checked') return !!i.checked_in_at
    if (tableFilter === 'pending') return !i.checked_in_at
    if (tableFilter === 'souvenir') return !!i.souvenir_claimed
    if (tableFilter === 'lunchbox') return !!i.lunchbox_claimed
    return true
  })

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <h1 style={{
          fontFamily: 'Cormorant Garamond,serif',
          fontSize: 32, fontStyle: 'italic', color: '#1e3d2a',
        }}>Check-in Hari H</h1>
        <button onClick={load} style={refreshBtn}>REFRESH</button>
      </div>

      {/* ─── MODE TOGGLE ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <ModeBtn active={mode === 'search'} onClick={() => setMode('search')}>
          CARI NAMA
        </ModeBtn>
        <ModeBtn active={mode === 'scan'} onClick={() => setMode('scan')}>
          SCAN QR
        </ModeBtn>
      </div>

      {/* ─── SEARCH MODE ──────────────────────────── */}
      {mode === 'search' && (
        <div style={panel}>
          <input
            autoFocus
            placeholder="Cari nama atau nomor WA atau ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px',
              border: '0.5px solid #d9cdb8', borderRadius: 8,
              fontSize: 15, outline: 'none',
            }}
          />
          {searchHits.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchHits.map(i => (
                <button
                  key={i.id}
                  onClick={() => {
                    setSelectedId(i.id ?? null)
                    setActionMsg(null)
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: '0.5px solid #ede5d4',
                    borderRadius: 8,
                    background: selectedId === i.id ? '#f0f7f1' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{i.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {i.guests ?? 1} tamu · {i.ref}
                      {isAnonPhysical(i) && ' · FISIK ANONIM'}
                    </div>
                  </div>
                  <StatusBadge inv={i} />
                </button>
              ))}
            </div>
          )}
          {search.trim().length > 0 && searchHits.length === 0 && !loading && (
            <p style={{ marginTop: 10, fontSize: 13, color: '#aaa' }}>
              Tidak ada hasil untuk &quot;{search}&quot;
            </p>
          )}
        </div>
      )}

      {/* ─── SCAN MODE ────────────────────────────── */}
      {mode === 'scan' && (
        <div style={panel}>
          {scanError ? (
            <p style={{ fontSize: 13, color: '#c0392b' }}>{scanError}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                style={{
                  width: '100%', maxWidth: 420,
                  borderRadius: 12, background: '#000',
                  display: 'block', margin: '0 auto',
                }}
                muted
                playsInline
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <p style={{
                fontSize: 12, color: '#888',
                textAlign: 'center', marginTop: 8,
              }}>
                Arahkan kamera ke QR pada tiket
              </p>
            </>
          )}
        </div>
      )}

      {/* ─── ACTION PANEL ─────────────────────────── */}
      {selected && (
        <div style={{ ...panel, borderColor: '#6b8f71', marginTop: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline',
            justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div>
              <div style={{
                fontFamily: 'Cormorant Garamond,serif',
                fontSize: 24, fontStyle: 'italic',
                color: '#1e3d2a',
              }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {selected.guests ?? 1} kursi · {selected.rsvp_status}
                {selected.ref && ` · ${selected.ref}`}
              </div>
            </div>
            <button
              onClick={() => { setSelectedId(null); setActionMsg(null) }}
              style={{
                background: 'none', border: 'none',
                fontSize: 20, color: '#888', cursor: 'pointer',
              }}
            >×</button>
          </div>

          {/* Physical anon → identification form */}
          {isAnonPhysical(selected) ? (
            <div style={{ marginTop: 10 }}>
              <p style={{
                padding: '8px 12px',
                background: '#fff8ec', borderRadius: 6,
                border: '0.5px solid #d4881a',
                fontSize: 12, color: '#b8600a',
                marginBottom: 12,
              }}>
                Slot fisik anonim — isi data tamu untuk check-in
              </p>
              <Field label="NAMA LENGKAP">
                <input
                  value={physName}
                  onChange={e => setPhysName(e.target.value)}
                  placeholder="Nama tamu"
                  style={input}
                />
              </Field>
              <Field label="NO. WHATSAPP (OPSIONAL)">
                <input
                  value={physPhone}
                  onChange={e => setPhysPhone(e.target.value)}
                  placeholder="628..."
                  style={input}
                />
              </Field>
              <Field label="JUMLAH TAMU">
                <select
                  value={physGuests}
                  onChange={e => setPhysGuests(Number(e.target.value))}
                  style={{ ...input, appearance: 'none' }}
                >
                  {Array.from({ length: selected.max_guests ?? 2 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} tamu</option>
                  ))}
                </select>
              </Field>
              <ActionBtn
                color="#1e3d2a"
                disabled={actionBusy === 'identify'}
                onClick={handleIdentifyPhysical}
                label={actionBusy === 'identify' ? 'MEMPROSES...' : 'TANDAI HADIR'}
              />
            </div>
          ) : (
            <>
              {!selected.checked_in_at ? (
                <ActionBtn
                  color="#1e3d2a"
                  disabled={actionBusy === 'checkin'}
                  onClick={handleCheckin}
                  label={actionBusy === 'checkin' ? '...' : 'TANDAI HADIR'}
                />
              ) : (
                <>
                  <p style={{
                    fontSize: 12, color: '#2d5a3d',
                    marginBottom: 14,
                  }}>
                    ✓ Check-in pada {new Date(selected.checked_in_at).toLocaleString('id')}
                  </p>
                  <ActionBtn
                    color="#b8965a"
                    disabled={!!selected.souvenir_claimed || actionBusy === 'souvenir'}
                    onClick={() => handleClaim('souvenir')}
                    label={selected.souvenir_claimed
                      ? '✓ SOUVENIR TELAH DISERAHKAN'
                      : (actionBusy === 'souvenir' ? '...' : 'SERAHKAN SOUVENIR')}
                  />
                  <ActionBtn
                    color="#2d5a3d"
                    disabled={!!selected.lunchbox_claimed || actionBusy === 'lunchbox'}
                    onClick={() => handleClaim('lunchbox')}
                    label={selected.lunchbox_claimed
                      ? '✓ LUNCHBOX TELAH DISERAHKAN'
                      : (actionBusy === 'lunchbox' ? '...' : 'SERAHKAN LUNCHBOX')}
                  />
                </>
              )}
            </>
          )}

          {actionMsg && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: '#f0f7f1', borderRadius: 6,
              border: '0.5px solid #6b8f71',
              fontSize: 13, color: '#2d5a3d',
            }}>{actionMsg}</div>
          )}
        </div>
      )}

      {/* ─── DASHBOARD STATS ──────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
        margin: '24px 0 16px',
      }}>
        <Stat label="Tamu Diharapkan" value={confirmed.length} sub={`${expectedSeats} kursi`} />
        <Stat label="Sudah Check-in" value={checkedIn.length} sub={`${checkedSeats} kursi`} color="#2d5a3d" />
        <Stat label="Souvenir Diserahkan" value={souvenirsClaimed} sub={`dari ${confirmed.length}`} color="#b8965a" />
        <Stat label="Lunchbox Diserahkan" value={lunchboxesClaimed} sub={`dari ${confirmed.length}`} color="#993556" />
      </div>

      <div style={{
        background: 'white', borderRadius: 12, padding: 16,
        border: '0.5px solid #ede5d4', marginBottom: 16,
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
          height: 10, borderRadius: 5,
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

      {/* ─── TABLE ─────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 12,
        border: '0.5px solid #ede5d4', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #ede5d4' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'checked', 'pending', 'souvenir', 'lunchbox'] as const).map(f => (
              <button key={f} onClick={() => setTableFilter(f)}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  border: '0.5px solid #d9cdb8',
                  background: tableFilter === f ? '#1e3d2a' : 'white',
                  color: tableFilter === f ? 'white' : '#888',
                  fontSize: 11, cursor: 'pointer',
                  fontFamily: 'Cinzel,serif', letterSpacing: 1,
                }}>
                {f === 'all' ? `SEMUA (${confirmed.length})` :
                  f === 'checked' ? `HADIR (${checkedIn.length})` :
                  f === 'pending' ? `BELUM (${confirmed.length - checkedIn.length})` :
                  f === 'souvenir' ? `SOUVENIR (${souvenirsClaimed})` :
                  `LUNCHBOX (${lunchboxesClaimed})`}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: '#888', fontSize: 13 }}>Memuat...</p>
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
              {tableRows.map(inv => (
                <tr key={inv.id}
                  onClick={() => { setSelectedId(inv.id ?? null); setActionMsg(null) }}
                  style={{
                    borderBottom: '0.5px solid #f0ece4',
                    cursor: 'pointer',
                    background: selectedId === inv.id ? '#f0f7f1' : 'transparent',
                  }}>
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
      </div>
    </div>
  )
}

// ─── Sub-components & styles ────────────────────────────────────

function ModeBtn({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '12px 18px',
      border: `0.5px solid ${active ? '#1e3d2a' : '#d9cdb8'}`,
      borderRadius: 8,
      background: active ? '#1e3d2a' : 'white',
      color: active ? 'white' : '#888',
      fontFamily: 'Cinzel,serif', fontSize: 12,
      letterSpacing: 2, cursor: 'pointer',
    }}>{children}</button>
  )
}

function Stat({ label, value, sub, color = '#1e3d2a' }: {
  label: string; value: number; sub: string; color?: string
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: 16, border: '0.5px solid #ede5d4',
    }}>
      <div style={{
        fontFamily: 'Cinzel,serif', fontSize: 9,
        letterSpacing: 2, color: '#6b8f71', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: 'Cormorant Garamond,serif',
        fontSize: 36, fontStyle: 'italic',
        color, lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function StatusBadge({ inv }: { inv: InviteeRow }) {
  if (inv.checked_in_at) {
    return <span style={pill('#e8f5e9', '#2d5a3d')}>✓ HADIR</span>
  }
  if (inv.rsvp_status === 'confirmed') {
    return <span style={pill('#fff8ec', '#f0a500')}>BELUM</span>
  }
  if (inv.rsvp_status === 'declined') {
    return <span style={pill('#fce8e8', '#c0392b')}>TIDAK</span>
  }
  return <span style={pill('#f0ece4', '#888')}>PENDING</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'block', marginBottom: 5,
        fontFamily: 'Cinzel,serif', fontSize: 9,
        letterSpacing: 2, color: '#6b8f71',
      }}>{label}</label>
      {children}
    </div>
  )
}

function ActionBtn({ color, disabled, onClick, label }: {
  color: string
  disabled: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px 18px',
      background: disabled ? '#e8f5e9' : color,
      color: disabled ? '#2d5a3d' : 'white',
      border: 'none', borderRadius: 10,
      fontFamily: 'Cinzel,serif', fontSize: 11,
      letterSpacing: 2,
      cursor: disabled ? 'default' : 'pointer',
      marginBottom: 8,
    }}>{label}</button>
  )
}

const panel: React.CSSProperties = {
  background: 'white', borderRadius: 12,
  padding: 16, border: '0.5px solid #ede5d4',
}
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '0.5px solid #d9cdb8', borderRadius: 8,
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
  background: 'white', color: '#1e3d2a',
}
const refreshBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '0.5px solid #d9cdb8',
  background: 'white', cursor: 'pointer',
  fontFamily: 'Cinzel,serif', fontSize: 10,
  letterSpacing: 2, color: '#1e3d2a',
}
function pill(bg: string, color: string): React.CSSProperties {
  return {
    padding: '2px 8px', borderRadius: 4,
    fontSize: 11, fontWeight: 500,
    background: bg, color,
  }
}
