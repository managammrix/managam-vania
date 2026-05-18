'use client'
import { useEffect, useState } from 'react'

interface Props { sections: string[] }

export default function NavDots({ sections }: Props) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY
      sections.forEach((id, i) => {
        const el = document.getElementById(id)
        if (!el) return
        const top = el.offsetTop - window.innerHeight / 2
        if (sy >= top && sy < top + el.offsetHeight) setActive(i)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections])

  return (
    <nav style={{
      position:'fixed',right:18,top:'50%',transform:'translateY(-50%)',
      zIndex:100,display:'flex',flexDirection:'column',gap:10,
    }}>
      {sections.map((id, i) => (
        <div
          key={id}
          role="button"
          tabIndex={0}
          onClick={() => document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}
          onKeyDown={(e) => e.key==='Enter' && document.getElementById(sections[i])?.scrollIntoView({behavior:'smooth'})}
          style={{padding:19,margin:-19,position:'relative',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
        >
          <div style={{
            width:6,height:6,borderRadius:'50%',transition:'all 0.3s',
            background: active===i ? 'var(--forest)' : 'var(--sage)',
            opacity: active===i ? 1 : 0.35,
            transform: active===i ? 'scale(1.5)' : 'scale(1)',
          }}/>
        </div>
      ))}
    </nav>
  )
}
