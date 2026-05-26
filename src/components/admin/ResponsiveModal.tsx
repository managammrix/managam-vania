'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Desktop max-width in px. Defaults to 420. */
  maxWidth?: number
}

export default function ResponsiveModal({ open, onClose, children, maxWidth = 420 }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 500,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-responsive-modal"
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          width: maxWidth,
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .admin-responsive-modal {
            width: 100% !important;
            max-width: 100vw !important;
            height: 100dvh;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            padding: 20px !important;
            padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </div>
  )
}
