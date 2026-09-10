'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { switchOrganizationAction } from '@/lib/actions/org'
import { ROLE_LABELS } from '@/lib/constants'
import type { Membership } from '@/lib/types'
import { cn } from '@/lib/utils'

export function OrgSwitcher({ membership }: { membership: Membership }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function select(orgId: string) {
    setOpen(false)
    if (orgId === membership.org.id) return
    startTransition(async () => {
      await switchOrganizationAction(orgId)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        <Building2 className="h-4 w-4 text-zinc-400" />
        <span className="max-w-[10rem] truncate">{membership.org.name}</span>
        <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-60 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
            {membership.allOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => select(org.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100'
                )}
              >
                <span className="truncate">
                  {org.name}
                  <span className="ml-1 text-xs text-zinc-400">
                    {ROLE_LABELS[org.role]}
                  </span>
                </span>
                {org.id === membership.org.id && (
                  <Check className="h-4 w-4 text-zinc-900" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
