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
  const items = NAV_ITEMS.filter((i) => !('managerOnly' in i && i.managerOnly) || isManager)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-6 font-semibold">
        <Clock className="h-5 w-5" />
        {APP_NAME}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon]
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          )
        })}

        {isSuperadmin && (
          <Link
            href="/admin"
            className={cn(
              'mt-2 flex items-center gap-3 rounded-xl border border-dashed border-indigo-200 px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-700 hover:bg-indigo-50'
            )}
          >
            <Shield className="h-4 w-4" />
            Super Admin
          </Link>
        )}
      </nav>
    </aside>
  )
}
