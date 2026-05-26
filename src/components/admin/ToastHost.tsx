'use client'

import { useEffect, useState } from 'react'

type ToastLevel = 'success' | 'error' | 'warn'

type ToastItem = {
  id: number
  level: ToastLevel
  message: string
}

type ToastListener = (item: ToastItem) => void

const listeners = new Set<ToastListener>()
let nextId = 1

function emit(level: ToastLevel, message: string) {
  const item: ToastItem = { id: nextId++, level, message }
  listeners.forEach((fn) => fn(item))
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  warn: (message: string) => emit('warn', message),
}

const DEFAULT_DURATION_MS = 3500

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: ToastListener = (item) => {
      setItems((prev) => [...prev, item])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id))
      }, DEFAULT_DURATION_MS)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="admin-toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`admin-toast admin-toast-${t.level}`}
          onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
