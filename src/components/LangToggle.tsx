'use client'
import { Lang } from '@/lib/translations'

interface Props { lang: Lang; setLang: (l: Lang) => void }

export default function LangToggle({ lang, setLang }: Props) {
  return (
    <div style={{
      position:'fixed',top:20,right:40,zIndex:300,
      display:'flex',border:'0.5px solid rgba(255,255,255,0.25)',overflow:'hidden',
    }}>
      {(['id','en'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding:'7px 14px',fontFamily:'Cinzel,serif',fontSize:9,letterSpacing:2,
            cursor:'pointer',border:'none',
            background: lang===l ? 'var(--gold)' : 'rgba(30,61,42,0.85)',
            color: lang===l ? 'var(--forest-deep)' : 'rgba(255,255,255,0.5)',
            backdropFilter:'blur(4px)',transition:'all 0.2s',textTransform:'uppercase',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
