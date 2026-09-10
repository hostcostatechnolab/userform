'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Building2, Users, LayoutGrid, ArrowLeft } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 font-semibold text-zinc-900">
          <Shield className="h-5 w-5 text-indigo-600" />
          Super Admin
        </span>
        <nav className="flex flex-1 items-center gap-1">
          {ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> App
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
