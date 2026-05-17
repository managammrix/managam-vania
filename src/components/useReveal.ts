'use client'
import { useEffect, useRef } from 'react'

export function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible')
      }),
      { threshold }
    )
    const el = ref.current
    if (el) {
      el.querySelectorAll('.reveal').forEach(r => obs.observe(r))
    }
    return () => obs.disconnect()
  }, [threshold])

  return ref
}
