'use client'
import { useEffect, useRef, useState } from 'react'

interface Props { play: boolean }

export default function AudioPlayer({ play }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!play || started) return
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0
    audio.loop = true
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
      <button
        onClick={toggle}
        title={muted || !started ? 'Play music' : 'Mute music'}
        style={{
          position: 'fixed',
          bottom: 64,
          left: 20,
          zIndex: 300,
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
        }}
      >
        {muted || !started ? '♪' : '♫'}
      </button>
    </>
  )
}
