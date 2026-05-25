'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEY } from '@/lib/adminAuth'

const PIN_LENGTH = 10

export default function AdminLogin() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const fail = useCallback(() => {
    setShake(true)
    setError(true)
    setPin('')
    setTimeout(() => setShake(false), 600)
  }, [])

  const attempt = useCallback(async (value: string) => {
    setPin(value)
    setError(false)
    if (value.length < PIN_LENGTH || verifying) return
    setVerifying(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': value,
        },
        body: JSON.stringify({ action: 'verify' }),
      })
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, value)
        localStorage.setItem('mv_admin_pin', value)
        router.replace('/admin')
      } else {
        // Wrong PIN — clear any stale saved value
        localStorage.removeItem('mv_admin_pin')
        fail()
      }
    } catch {
      fail()
    } finally {
      setVerifying(false)
    }
  }, [router, verifying, fail])

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        sessionStorage.getItem(SESSION_KEY)) {
      router.replace('/admin')
      return
    }
    // Auto-fill saved PIN — auto-verifies if full-length
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mv_admin_pin')
      if (saved) attempt(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const tapDigit = (d: string) => {
    if (verifying || pin.length >= PIN_LENGTH) return
    const next = pin + d
    attempt(next)
  }

  const tapBackspace = () => {
    if (verifying) return
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  const tapClear = () => {
    if (verifying) return
    setPin('')
    setError(false)
  }

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'#1e3d2a',
      padding: 16,
    }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .shake { animation: shake 0.5s ease; }
      `}</style>

      <div style={{
        background:'#faf6ef',
        borderRadius:20,
        padding:'40px 32px',
        width:360,
        maxWidth:'100%',
        textAlign:'center',
        boxShadow:'0 32px 80px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          fontFamily:'Cinzel,serif',
          fontSize:13,
          letterSpacing:4,
          color:'#b8965a',
          marginBottom:6,
        }}>M &amp; V</div>

        <div style={{
          fontFamily:'Cormorant Garamond,serif',
          fontSize:22,
          fontStyle:'italic',
          color:'#1e3d2a',
          marginBottom:4,
        }}>Admin Panel</div>

        <div style={{
          fontSize:11,
          color:'#9db89f',
          letterSpacing:2,
          fontFamily:'Cinzel,serif',
          marginBottom:28,
        }}>20.06.2026</div>

        <div
          className={shake ? 'shake' : ''}
          style={{
            display:'flex',
            justifyContent:'center',
            gap:10,
            marginBottom:14,
            userSelect: 'none',
          }}
        >
          {Array.from({length:PIN_LENGTH}).map((_,i) => (
            <div key={i} style={{
              width:12,
              height:12,
              borderRadius:'50%',
              background: i < pin.length
                ? (error ? '#c0392b' : '#1e3d2a')
                : '#d9cdb8',
              transition:'background 0.15s ease',
            }}/>
          ))}
        </div>

        <div style={{
          fontFamily:'Cinzel,serif',
          fontSize:10,
          letterSpacing:3,
          color: error ? '#c0392b' : '#9db89f',
          marginBottom:24,
          minHeight: 14,
          userSelect: 'none',
        }}>
          {verifying ? 'MEMVERIFIKASI...' :
           error ? 'PIN SALAH — COBA LAGI' : 'MASUKKAN PIN'}
        </div>

        {/* Numeric keypad — PIN entry only via these buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <Key key={d} onClick={() => tapDigit(d)} disabled={verifying}>
              {d}
            </Key>
          ))}
          <Key onClick={tapClear} disabled={verifying} muted>
            BERSIH
          </Key>
          <Key onClick={() => tapDigit('0')} disabled={verifying}>
            0
          </Key>
          <Key onClick={tapBackspace} disabled={verifying} muted>
            ⌫
          </Key>
        </div>
      </div>
    </div>
  )
}

function Key({ onClick, disabled, muted, children }: {
  onClick: () => void
  disabled?: boolean
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '16px 0',
        background: muted ? 'transparent' : '#ffffff',
        border: '0.5px solid #d9cdb8',
        borderRadius: 12,
        fontFamily: muted ? 'Cinzel,serif' : 'Cormorant Garamond,serif',
        fontSize: muted ? 11 : 24,
        letterSpacing: muted ? 2 : 0,
        color: muted ? '#9db89f' : '#1e3d2a',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        transition: 'background 0.15s ease',
      }}
      onMouseDown={e => {
        if (!disabled && !muted) (e.currentTarget as HTMLButtonElement).style.background = '#f0ece4'
      }}
      onMouseUp={e => {
        if (!muted) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
      }}
      onMouseLeave={e => {
        if (!muted) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
      }}
    >
      {children}
    </button>
  )
}
