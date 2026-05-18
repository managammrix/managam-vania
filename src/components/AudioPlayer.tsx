'use client'
import { useEffect, useRef, useState } from 'react'

interface Props { play: boolean }

export default function AudioPlayer({ play }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(false)
  const [started, setStarted] = useState(false)
  const [showLabel, setShowLabel] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowLabel(false), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!play || started) return
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0
    audio.loop = true
    audio.currentTime = 0.85
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setStarted(true)
        // Fade in from 0 to 0.35 over 2 seconds
        let vol = 0
        const interval = setInterval(() => {
          vol = Math.min(vol + 0.025, 0.35)
          audio.volume = vol
          if (vol >= 0.35) clearInterval(interval)
        }, 140)
      }).catch(() => {
        // Autoplay blocked — show unmute button for manual start
        setStarted(false)
      })
    }
  }, [play, started])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!started) {
      audio.currentTime = 0.85
      audio.volume = 0.35
      audio.loop = true
      audio.play().then(() => setStarted(true)).catch(() => {})
      setMuted(false)
      return
    }
    if (muted) {
      audio.volume = 0.35
      setMuted(false)
    } else {
      audio.volume = 0
      setMuted(true)
    }
  }

  return (
    <>
      {/* Place your bgm.mp3 file in the public/ folder */}
      {/* Recommended: Goodness of God instrumental, ~5min,
          normalized to -14 LUFS, exported as MP3 192kbps */}
      <audio ref={audioRef} src="/bgm.mp3" preload="none" />
      <div style={{position:'fixed',bottom:100,left:20,zIndex:300,display:'flex',alignItems:'center'}}>
        <button
          onClick={toggle}
          title={muted || !started ? 'Play music' : 'Mute music'}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(30,61,42,0.85)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            fontSize: 16,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {muted || !started ? '♪' : '♫'}
        </button>
        {showLabel && (
          <span style={{
            position: 'absolute',
            left: 48,
            fontFamily: 'Cinzel,serif',
            fontSize: 10,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.75)',
            whiteSpace: 'nowrap',
            animation: 'fadeOutLabel 3s ease forwards',
          }}>
            MUSIC ON
          </span>
        )}
      </div>
    </>
  )
}
