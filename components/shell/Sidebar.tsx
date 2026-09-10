'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Shield } from 'lucide-react'
import { APP_NAME, NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { NAV_ICONS } from './nav-icons'

export function Sidebar({
  isManager,
  isSuperadmin = false,
}: {
  isManager: boolean
  isSuperadmin?: boolean
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(
    (i) => !('managerOnly' in i && i.managerOnly) || isManager
  )

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy text-slate-300 lg:flex">
      {/* brand */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/30">
          <Clock className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-white">
          {APP_NAME}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon]
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
              )}
              {Icon && (
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    active ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
              )}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {isSuperadmin && (
        <div className="border-t border-white/10 p-3">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-blue-500/15 text-blue-200'
                : 'text-slate-400 hover:bg-white/5 hover:text-blue-200'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            Super Admin
          </Link>
        </div>
      )}
    </aside>
  )
}
