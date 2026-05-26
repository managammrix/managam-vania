'use client'
import { usePathname } from 'next/navigation'
import { signOutAdmin } from '@/lib/adminAuth'
import MobileBottomNav from '@/components/admin/MobileBottomNav'
import ToastHost from '@/components/admin/ToastHost'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '◎' },
  { href: '/admin/invitees', label: 'Tamu', icon: '◈' },
  { href: '/admin/messages', label: 'Kirim Pesan', icon: '◉' },
  { href: '/admin/checkin', label: 'Check-in', icon: '✓' },
  { href: '/admin/wishes', label: 'Ucapan', icon: '◇' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div style={{
      display:'flex', minHeight:'100vh',
      fontFamily:'var(--font-sans, system-ui)',
      background:'#f8f7f4',
    }}>
      <aside className="admin-sidebar-mobile-hide" style={{
        width:220, background:'#1e3d2a',
        display:'flex', flexDirection:'column',
        padding:'32px 0', flexShrink:0,
        position:'sticky', top:0, height:'100vh',
      }}>
        <div style={{
          padding:'0 24px 32px',
          borderBottom:'0.5px solid rgba(255,255,255,0.1)',
          marginBottom:24,
        }}>
          <div style={{
            fontFamily:'Cinzel,serif',fontSize:13,
            letterSpacing:2,color:'#b8965a',
            marginBottom:4,
          }}>M & V</div>
          <div style={{
            fontSize:11,color:'rgba(255,255,255,0.4)',
            letterSpacing:1,
          }}>ADMIN PANEL</div>
        </div>

        <nav style={{flex:1,padding:'0 12px'}}>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display:'flex', alignItems:'center',
                gap:10, padding:'10px 12px',
                borderRadius:8, marginBottom:4,
                textDecoration:'none',
                fontSize:13,
                background: pathname===item.href
                  ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: pathname===item.href
                  ? 'white' : 'rgba(255,255,255,0.55)',
                transition:'all 0.2s',
              }}
            >
              <span style={{fontSize:16}}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{padding:'0 12px'}}>
          <button
            onClick={signOutAdmin}
            style={{
              width:'100%', padding:'10px 12px',
              background:'none',
              border:'0.5px solid rgba(255,255,255,0.15)',
              borderRadius:8, color:'rgba(255,255,255,0.4)',
              fontSize:12, cursor:'pointer',
              letterSpacing:1,
            }}
          >
            SIGN OUT
          </button>
        </div>
      </aside>

      <main className="admin-pad-tight-mobile admin-pad-bottom-nav" style={{
        flex:1, padding:'40px 48px',
        overflowY:'auto',
      }}>
        {children}
      </main>
      <MobileBottomNav />
      <ToastHost />
    </div>
  )
}
