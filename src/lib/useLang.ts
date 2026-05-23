'use client'
import { useState, useEffect, useCallback } from 'react'
import { t, Lang, Translations } from './translations'

export function useLang() {
  // Always start with 'id' — same on server and client to avoid hydration mismatch
  const [lang, setLangState] = useState<Lang>('id')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Only read localStorage after mount
    const saved = localStorage.getItem('mv_lang')
    if (saved === 'en') setLangState('en')
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('mv_lang', l)
    }
  }, [])

  const tr = t[lang] as Translations
  return { lang, setLang, tr, mounted }
}
