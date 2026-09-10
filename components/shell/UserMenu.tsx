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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
        aria-label="Account menu"
      >
        {initials(name)}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-zinc-900">
                {name || 'Your account'}
              </p>
              {email && (
                <p className="truncate text-xs text-zinc-500">{email}</p>
              )}
            </div>
            <div className="my-1 h-px bg-zinc-100" />
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <UserIcon className="h-4 w-4" /> Profile
            </Link>
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <div className="my-1 h-px bg-zinc-100" />
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
