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
    <header className="border-b border-white/10 bg-navy text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600">
            <Shield className="h-4 w-4 text-white" />
          </span>
          Super Admin
        </span>
        <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto sm:flex-1">
          {ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
          className="ml-auto flex items-center gap-1 text-sm text-slate-400 hover:text-white sm:ml-0"
        >
          <ArrowLeft className="h-4 w-4" /> App
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
