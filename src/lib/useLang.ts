'use client'
import { useState, useCallback } from 'react'
import { t, Lang, Translations } from './translations'

export function useLang() {
  const [lang, setLangState] = useState<Lang>('id')
  const tr = t[lang] as Translations

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  return { lang, setLang, tr }
}
