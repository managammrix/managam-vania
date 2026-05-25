'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  InviteeRow,
  fetchInviteeByRef,
  checkinByRef,
  claimSouvenirByRef,
  claimLunchboxByRef,
  updatePhysicalGuest,
  CheckinResult,
} from '@/lib/supabase'

type ClaimState = {
  souvenir: boolean
  lunchbox: boolean
}

function isAnonymousPhysical(row: InviteeRow): boolean {
  // Primary signal: type === 'physical'. Fallback: name pattern —
  // protects against a stale get_invitee_by_ref RPC that doesn't yet
  // return the type column.
  const nameLooksPhysical = row.name.startsWith('Undangan Fisik')
  if (row.type === 'physical') return nameLooksPhysical
  if (row.type === undefined && nameLooksPhysical) return true
  return false
}

function CheckinContent() {
  const [loading, setLoading] = useState(true)
  const [invitee, setInvitee] = useState<InviteeRow | null>(null)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [ref, setRef] = useState<string | null>(null)
  const [needsIdentification, setNeedsIdentification] = useState(false)
  const [claims, setClaims] = useState<ClaimState>({ souvenir: false, lunchbox: false })
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<'souvenir' | 'lunchbox' | 'identify' | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formGuests, setFormGuests] = useState(1)

  // Initial load — fetch invitee row first to decide flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('ref')
    if (!r) {
      setLoading(false)
      setResult({ success: false, error: 'Ref tidak ada di URL' })
      return
    }
    setRef(r)
    fetchInviteeByRef(r).then(row => {
      console.log('[checkin] fetched data:', row)
      console.log('[checkin] type:', row?.type)
      console.log('[checkin] name:', row?.name)
      if (!row) {
        setResult({ success: false, error: 'Tamu tidak ditemukan' })
        setLoading(false)
        return
      }
      setInvitee(row)
      console.log('[checkin] isAnonymousPhysical:', isAnonymousPhysical(row))
      if (isAnonymousPhysical(row)) {
        // Show form first; don't check in until usher submits
        setFormGuests(row.guests ?? 1)
        setNeedsIdentification(true)
        setLoading(false)
      } else {
        // Digital OR physical-with-real-name → check in immediately
        checkinByRef(r).then(res => {
          setResult(res)
          setClaims({
            souvenir: !!res.souvenir_claimed,
            lunchbox: !!res.lunchbox_claimed,
          })
          setLoading(false)
        })
      }
    })
  }, [])

  const handleIdentify = async () => {
    if (!ref) return
    if (!formName.trim()) { alert('Mohon masukkan nama tamu.'); return }
    setBusy('identify')
    const res = await updatePhysicalGuest(ref, formName.trim(), formPhone.trim(), formGuests)
    if (!res.success) {
      setBusy(null)
      alert(`Gagal: ${res.error ?? 'Unknown error'}`)
      return
    }
    // After identification + atomic check-in, fetch fresh state so
    // the success card renders souvenir/lunchbox buttons.
    const fresh = await checkinByRef(ref)
    setResult(fresh)
    setClaims({
      souvenir: !!fresh.souvenir_claimed,
      lunchbox: !!fresh.lunchbox_claimed,
    })
    setNeedsIdentification(false)
    setBusy(null)
  }

  const handleClaim = async (kind: 'souvenir' | 'lunchbox') => {
    if (!ref) return
    setBusy(kind)
    setClaimMsg(null)
    const res = kind === 'souvenir'
      ? await claimSouvenirByRef(ref)
      : await claimLunchboxByRef(ref)
    setBusy(null)
    if (res.success) {
      setClaims(c => ({ ...c, [kind]: true }))
      setClaimMsg(`✓ ${kind === 'souvenir' ? 'Souvenir' : 'Lunchbox'} diserahkan untuk ${res.name}`)
    } else if (res.already_claimed) {
      setClaims(c => ({ ...c, [kind]: true }))
      setClaimMsg(`⚠ ${kind === 'souvenir' ? 'Souvenir' : 'Lunchbox'} sudah pernah diserahkan`)
    } else {
      setClaimMsg(`✗ Gagal: ${res.error ?? 'Unknown error'}`)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  }

  if (loading) {
    return (
      <Frame>
        <div style={cardStyle}>
          <p style={muted}>Memproses...</p>
        </div>
      </Frame>
    )
  }

  // ─── Anonymous physical slot — identification form ───────────────
  if (needsIdentification && invitee) {
    const maxSeats = invitee.guests && invitee.guests > 0 ? invitee.guests : 2
    return (
      <Frame>
        <div style={cardStyle}>
          <div style={{
            fontFamily: 'Cinzel,serif',
            fontSize: 10, letterSpacing: 4,
            color: '#b8965a', marginBottom: 8,
            textAlign: 'center',
          }}>SLOT FISIK · {invitee.name.replace('Undangan Fisik ', '')}</div>
          <h2 style={{
            fontFamily: 'Cormorant Garamond,serif',
            fontSize: 26, fontStyle: 'italic',
            color: '#1e3d2a', textAlign: 'center',
            marginBottom: 8,
          }}>Identifikasi Tamu</h2>
          <p style={{
            textAlign: 'center', color: '#888',
            fontSize: 13, lineHeight: 1.6,
            marginBottom: 20,
          }}>
            Mohon isi nama tamu untuk slot undangan fisik ini.
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={formLabel}>NAMA LENGKAP</label>
            <input
              id="physical-name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Nama tamu"
              style={formInput}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={formLabel}>NO. WHATSAPP (OPSIONAL)</label>
            <input
              id="physical-phone"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              placeholder="628..."
              style={formInput}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={formLabel}>JUMLAH TAMU</label>
            <select
              id="physical-guests"
              value={formGuests}
              onChange={e => setFormGuests(Number(e.target.value))}
              style={{ ...formInput, appearance: 'none' }}
            >
              {Array.from({ length: maxSeats }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} tamu</option>
              ))}
            </select>
          </div>

          <button
            id="identify-submit"
            onClick={handleIdentify}
            disabled={busy === 'identify'}
            style={{
              width: '100%', padding: '14px 18px',
              background: '#1e3d2a', color: 'white',
              border: 'none', borderRadius: 10,
              fontFamily: 'Cinzel,serif',
              fontSize: 11, letterSpacing: 3,
              cursor: busy === 'identify' ? 'default' : 'pointer',
              opacity: busy === 'identify' ? 0.6 : 1,
            }}
          >{busy === 'identify' ? 'MEMPROSES...' : 'TANDAI HADIR'}</button>
        </div>
      </Frame>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────
  if (!result || (!result.success && !result.already_checked_in)) {
    return (
      <Frame>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
          <h2 style={h2}>Tidak ditemukan</h2>
          <p style={muted}>{result?.error ?? 'Ref tidak valid'}</p>
        </div>
      </Frame>
    )
  }

  // ─── Success / already checked in ────────────────────────────────
  const isAlready = !!result.already_checked_in
  const guests = result.guests ?? 1

  return (
    <Frame>
      <div style={cardStyle}>
        <div style={{
          fontFamily: 'Cinzel,serif',
          fontSize: 10, letterSpacing: 4,
          color: '#9db89f', marginBottom: 8,
          textAlign: 'center',
        }}>
          {isAlready ? 'SUDAH CHECK-IN' : 'CHECK-IN BERHASIL'}
        </div>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>
          {isAlready ? '✓' : '🎉'}
        </div>
        <h2 style={{
          fontFamily: 'Cormorant Garamond,serif',
          fontSize: 32, fontStyle: 'italic',
          color: '#1e3d2a', textAlign: 'center',
          marginBottom: 6,
        }}>{result.name}</h2>
        <p style={{
          textAlign: 'center', color: '#6b8f71',
          fontSize: 13, marginBottom: 20,
          fontFamily: 'Cinzel,serif', letterSpacing: 2,
        }}>{guests} TAMU</p>

        {isAlready && result.checked_in_at && (
          <p style={{
            textAlign: 'center', color: '#999',
            fontSize: 12, marginBottom: 20,
          }}>
            Check-in pada {new Date(result.checked_in_at).toLocaleString('id')}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <ClaimButton
            id="souvenir-btn"
            label="Serahkan Souvenir"
            claimed={claims.souvenir}
            busy={busy === 'souvenir'}
            onClick={() => handleClaim('souvenir')}
            color="#b8965a"
          />
          <ClaimButton
            id="lunchbox-btn"
            label="Serahkan Lunchbox"
            claimed={claims.lunchbox}
            busy={busy === 'lunchbox'}
            onClick={() => handleClaim('lunchbox')}
            color="#2d5a3d"
          />
        </div>

        {claimMsg && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: '#f0f7f1',
            border: '0.5px solid #6b8f71',
            borderRadius: 8, fontSize: 13,
            color: '#2d5a3d', textAlign: 'center',
          }}>{claimMsg}</div>
        )}

        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '0.5px solid #ede5d4',
          textAlign: 'center',
          fontFamily: 'Cinzel,serif', fontSize: 9,
          letterSpacing: 3, color: '#aaa',
        }}>
          #BuildingMANAGAMVANturesWithGod
        </div>
      </div>
    </Frame>
  )
}

function ClaimButton({ id, label, claimed, busy, onClick, color }: {
  id?: string
  label: string
  claimed: boolean
  busy: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={claimed || busy}
      style={{
        padding: '14px 18px',
        background: claimed ? '#e8f5e9' : color,
        color: claimed ? '#2d5a3d' : 'white',
        border: 'none', borderRadius: 10,
        fontFamily: 'Cinzel,serif',
        fontSize: 11, letterSpacing: 2,
        cursor: claimed || busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <span>{busy ? '...' : label}</span>
      <span>{claimed ? '✓' : '→'}</span>
    </button>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1e3d2a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>{children}</div>
  )
}

const h2: React.CSSProperties = {
  fontFamily: 'Cormorant Garamond,serif',
  fontSize: 26, fontStyle: 'italic',
  color: '#1e3d2a', textAlign: 'center',
  marginBottom: 10,
}
const muted: React.CSSProperties = {
  fontSize: 14, color: '#888',
  textAlign: 'center',
}
const formLabel: React.CSSProperties = {
  fontFamily: 'Cinzel,serif', fontSize: 9,
  letterSpacing: 2, color: '#6b8f71',
  display: 'block', marginBottom: 6,
}
const formInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '0.5px solid #d9cdb8',
  borderRadius: 8, fontSize: 14,
  outline: 'none', fontFamily: 'inherit',
  background: 'white', color: '#1e3d2a',
}

export default dynamic(() => Promise.resolve(CheckinContent), {
  ssr: false,
})
