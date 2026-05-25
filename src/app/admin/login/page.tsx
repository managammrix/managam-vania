'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEY } from '@/lib/adminAuth'

const PIN_LENGTH = 8

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

  const focusInput = () => inputRef.current?.focus()

  return (
    <div
      onClick={focusInput}
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
        padding:'48px 36px',
        width:360,
        maxWidth:'100%',
        textAlign:'center',
        boxShadow:'0 32px 80px rgba(0,0,0,0.4)',
        position:'relative',
        cursor: 'pointer',
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
          marginBottom:36,
        }}>20.06.2026</div>

        {/* Hidden numeric input — triggers native 0-9 keypad on mobile.
            type="tel" + inputMode="numeric" is the standard OTP pattern.
            Visually invisible but focusable (no pointer-events:none). */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
            attempt(val)
          }}
          autoFocus
          autoComplete="one-time-code"
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
            border: 0,
            padding: 0,
          }}
        />

        {/* OTP-style box display — tap anywhere to focus the hidden input */}
        <div
          className={shake ? 'shake' : ''}
          onClick={focusInput}
          style={{
            display:'flex',
            justifyContent:'center',
            gap:8,
            marginBottom:18,
            userSelect: 'none',
          }}
        >
          {Array.from({length:PIN_LENGTH}).map((_,i) => {
            const filled = i < pin.length
            return (
              <div key={i} style={{
                width: 34,
                height: 44,
                borderRadius: 8,
                border: `1px solid ${
                  error ? '#c0392b' :
                  filled ? '#1e3d2a' : '#d9cdb8'
                }`,
                background: filled ? '#1e3d2a' : 'white',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontSize: 20,
                color: filled
                  ? (error ? '#c0392b' : '#faf6ef')
                  : '#d9cdb8',
                transition:'all 0.15s ease',
              }}>
                {filled ? '●' : ''}
              </div>
            )
          })}
        </div>

        <div style={{
          fontFamily:'Cinzel,serif',
          fontSize:10,
          letterSpacing:3,
          color: error ? '#c0392b' : '#9db89f',
          minHeight: 14,
          userSelect: 'none',
        }}>
          {verifying ? 'MEMVERIFIKASI...' :
           error ? 'PIN SALAH — COBA LAGI' :
           pin.length === 0 ? 'KETUK UNTUK MASUKKAN PIN' :
           'MASUKKAN PIN'}
        </div>
      </div>
    </div>
  )
}
