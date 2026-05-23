'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const SESSION_KEY = 'mv_admin_auth'

export function useAdminAuth() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY) !== 'true') {
      router.replace('/admin/login')
    }
  }, [router])
}

export function signOutAdmin() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
  window.location.href = '/admin/login'
}
