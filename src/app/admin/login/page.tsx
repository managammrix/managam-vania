'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEY } from '@/lib/adminAuth'

const PIN_LENGTH = 10

export default function AdminLogin() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fail = useCallback(() => {
    setShake(true)
    setError(true)
    setPin('')
    setTimeout(() => setShake(false), 600)
    inputRef.current?.focus()
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
    inputRef.current?.focus()
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mv_admin_pin')
      if (saved) attempt(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const tap = (k: string) => {
    inputRef.current?.focus()
    if (verifying) return
    if (k === 'BERSIH') {
      setPin('')
      setError(false)
      return
    }
    if (k === '⌫') {
      setPin(p => p.slice(0, -1))
      setError(false)
      return
    }
    const next = (pin + k).slice(0, PIN_LENGTH)
    attempt(next)
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
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
        position:'relative',
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

        {/* Hidden focused input — accepts keyboard input on desktop.
            Uppercases, caps at PIN_LENGTH, auto-attempts at full length. */}
        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={e => {
            const val = e.target.value.toUpperCase().slice(0, PIN_LENGTH)
            attempt(val)
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 1,
            height: 1,
          }}
        />

        {/* Dot display */}
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

        {/* On-screen keypad — for mobile / no-keyboard devices */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          maxWidth: 260,
          margin: '0 auto',
        }}>
          {['1','2','3','4','5','6','7','8','9','BERSIH','0','⌫'].map(k => (
            <Key
              key={k}
              onClick={() => tap(k)}
              disabled={verifying}
              muted={k === 'BERSIH' || k === '⌫'}
            >
              {k}
            </Key>
          ))}
        </div>

        <div style={{
          fontSize:10,
          color:'#9db89f',
          letterSpacing:2,
          fontFamily:'Cinzel,serif',
          marginTop:18,
          userSelect: 'none',
        }}>
          Atau ketik via keyboard
        </div>
      </div>
    </div>
  )
}

function Key({ onClick, disabled, muted, children }: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
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
    >
      {children}
    </button>
  )
}
