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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur lg:hidden">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon]
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {Icon && (
                <Icon
                  className={cn('h-5 w-5', active && 'text-blue-400')}
                />
              )}
              {item.label.split(' ')[0]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
