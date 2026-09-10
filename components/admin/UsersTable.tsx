'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ShieldCheck, Trash2 } from 'lucide-react'
import { setUserDeactivatedAction, deleteUserAction } from '@/lib/actions/admin'
import { useAction } from '@/components/ui/use-action'
import { Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Alert, Badge } from '@/components/ui/misc'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDayLabel } from '@/lib/time'
import type { AdminUserRow } from '@/lib/queries/admin'

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return users
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(needle) ||
        (u.email ?? '').toLowerCase().includes(needle) ||
        u.orgs.some((o) => o.name.toLowerCase().includes(needle))
    )
  }, [users, q])

  function toggle(u: AdminUserRow) {
    const deactivate = !u.deactivated_at
    if (
      deactivate &&
      !confirm(`Deactivate ${u.full_name || u.email}? They will be signed out.`)
    )
      return
    setBusyId(u.id)
    run(() => setUserDeactivatedAction(u.id, deactivate), {
      onSuccess: () => {
        setBusyId(null)
        router.refresh()
      },
    })
  }

  function remove(u: AdminUserRow) {
    const typed = window.prompt(
      `Permanently delete this account and ALL its data. This cannot be undone.\n\nType the email to confirm:\n${u.email ?? ''}`
    )
    if (typed == null) return
    if (typed.trim().toLowerCase() !== (u.email ?? '').toLowerCase()) {
      alert('That did not match the email — nothing was deleted.')
      return
    }
    setBusyId(u.id)
    run(() => deleteUserAction(u.id), {
      onSuccess: () => {
        setBusyId(null)
        router.refresh()
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Users
          <span className="ml-2 text-sm font-normal text-slate-400">
            {users.length}
          </span>
        </h1>
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, org"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {error && <Alert tone="red">{error}</Alert>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-2.5 font-semibold">User</th>
              <th className="px-4 py-2.5 font-semibold">Organizations</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentUserId
              return (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900">
                      {u.full_name || 'Unnamed'}
                      {u.is_superadmin && (
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {u.orgs.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.orgs.map((o) => (
                          <span
                            key={o.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                          >
                            {o.name}
                            <span className="ml-1 text-slate-400">
                              {ROLE_LABELS[o.role]}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatDayLabel(u.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.deactivated_at ? (
                      <Badge tone="red">Deactivated</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.is_superadmin || isSelf ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant={u.deactivated_at ? 'secondary' : 'danger'}
                          loading={pending && busyId === u.id}
                          onClick={() => toggle(u)}
                        >
                          {u.deactivated_at ? 'Reactivate' : 'Deactivate'}
                        </Button>
                        <button
                          onClick={() => remove(u)}
                          disabled={pending && busyId === u.id}
                          title="Delete permanently"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
