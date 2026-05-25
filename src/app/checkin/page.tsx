'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  checkinByRef,
  claimSouvenirByRef,
  claimLunchboxByRef,
  CheckinResult,
} from '@/lib/supabase'

type ClaimState = {
  souvenir: boolean
  lunchbox: boolean
}

function CheckinContent() {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [ref, setRef] = useState<string | null>(null)
  const [claims, setClaims] = useState<ClaimState>({ souvenir: false, lunchbox: false })
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<'souvenir' | 'lunchbox' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('ref')
    if (!r) {
      setLoading(false)
      setResult({ success: false, error: 'Ref tidak ada di URL' })
      return
    }
    setRef(r)
    checkinByRef(r).then(res => {
      setResult(res)
      setClaims({
        souvenir: !!res.souvenir_claimed,
        lunchbox: !!res.lunchbox_claimed,
      })
      setLoading(false)
    })
  }, [])

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
          <p style={muted}>Memproses check-in...</p>
        </div>
      </Frame>
    )
  }

  if (!result || (!result.success && !result.already_checked_in)) {
    return (
      <Frame>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={h2}>Tidak ditemukan</h2>
          <p style={muted}>{result?.error ?? 'Ref tidak valid'}</p>
        </div>
      </Frame>
    )
  }

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
            label="Serahkan Souvenir"
            claimed={claims.souvenir}
            busy={busy === 'souvenir'}
            onClick={() => handleClaim('souvenir')}
            color="#b8965a"
          />
          <ClaimButton
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

function ClaimButton({ label, claimed, busy, onClick, color }: {
  label: string
  claimed: boolean
  busy: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
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

export default dynamic(() => Promise.resolve(CheckinContent), {
  ssr: false,
})
