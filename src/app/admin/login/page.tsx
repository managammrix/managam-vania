'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEY } from '@/lib/adminAuth'

const CORRECT_PIN = 'MV20062026'

export default function AdminLogin() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        sessionStorage.getItem(SESSION_KEY) === 'true') {
      router.replace('/admin')
      return
    }
    inputRef.current?.focus()
  }, [router])

  const attempt = (value: string) => {
    setPin(value)
    setError(false)
    if (value.length < CORRECT_PIN.length) return
    if (value === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      router.replace('/admin')
    } else {
      setShake(true)
      setError(true)
      setPin('')
      setTimeout(() => setShake(false), 600)
      inputRef.current?.focus()
    }
  }

  const dots = CORRECT_PIN.length

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'#1e3d2a',
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
        padding:'52px 44px',
        width:360,
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
          marginBottom:40,
        }}>20.06.2026</div>

        <div
          className={shake ? 'shake' : ''}
          style={{
            display:'flex',
            justifyContent:'center',
            gap:10,
            marginBottom:32,
          }}
        >
          {Array.from({length:dots}).map((_,i) => (
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

        <input
          ref={inputRef}
          type="password"
          inputMode="text"
          value={pin}
          maxLength={CORRECT_PIN.length}
          onChange={e => attempt(e.target.value)}
          style={{
            position:'absolute',
            opacity:0,
            pointerEvents:'none',
            width:1,
            height:1,
          }}
        />

        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            fontFamily:'Cinzel,serif',
            fontSize:10,
            letterSpacing:3,
            color: error ? '#c0392b' : '#9db89f',
            cursor:'pointer',
            userSelect:'none',
            marginBottom:8,
          }}
        >
          {error ? 'PIN SALAH — COBA LAGI' : 'MASUKKAN PIN'}
        </div>

        <div style={{
          fontSize:11,
          color:'#d9cdb8',
          marginTop:16,
        }}>
          Ketuk di sini lalu ketik PIN
        </div>
      </div>
    </div>
  )
}
