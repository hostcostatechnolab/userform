'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SettingsTabs({ isManager }: { isManager: boolean }) {
  const pathname = usePathname()
  const tabs = [
    { href: '/settings/profile', label: 'Profile' },
    ...(isManager
      ? [{ href: '/settings/workspace', label: 'Workspace' }]
      : []),
  ]

  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-0.5 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'rounded-lg px-3 py-1.5 font-medium',
            pathname === t.href
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
