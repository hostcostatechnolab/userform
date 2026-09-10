'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import { initials } from '@/lib/utils'

export function UserMenu({
  name,
  email,
}: {
  name: string | null
  email: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-slate-700 to-slate-900 text-sm font-semibold text-white ring-1 ring-slate-900/10 transition-transform hover:scale-105"
        aria-label="Account menu"
      >
        {initials(name)}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute right-0 z-20 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-pop">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-900">
                {name || 'Your account'}
              </p>
              {email && (
                <p className="truncate text-xs text-slate-500">{email}</p>
              )}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <UserIcon className="h-4 w-4" /> Profile
            </Link>
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <div className="my-1 h-px bg-slate-100" />
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
