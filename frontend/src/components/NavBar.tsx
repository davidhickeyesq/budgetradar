'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/import', label: 'Import Data' },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:text-white hover:bg-white/15'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
