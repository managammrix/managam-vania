'use client'

import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'DASHBOARD', icon: '◎' },
  { href: '/admin/invitees', label: 'TAMU', icon: '◈' },
  { href: '/admin/checkin', label: 'CHECK-IN', icon: '✓' },
  { href: '/admin/messages', label: 'PESAN', icon: '◉' },
  { href: '/admin/wishes', label: 'UCAPAN', icon: '◇' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function MobileBottomNav() {
  const pathname = usePathname() || ''
  if (pathname === '/admin/login') return null

  return (
    <nav className="admin-bottom-nav" aria-label="Admin">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href)
        return (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
