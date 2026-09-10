'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { NAV_ICONS } from './nav-icons'

export function MobileNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(
    (i) => !('managerOnly' in i && i.managerOnly) || isManager
  ).slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon]
        const active =
          pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium',
              active ? 'text-zinc-900' : 'text-zinc-400'
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
            {item.label.split(' ')[0]}
          </Link>
        )
      })}
    </nav>
  )
}
