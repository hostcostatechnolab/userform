'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Trash2, UserPlus, Mail } from 'lucide-react'
import {
  inviteMemberAction,
  revokeInviteAction,
  updateMemberRoleAction,
  removeMemberAction,
} from '@/lib/actions/org'
import { ORG_ROLES, ROLE_LABELS } from '@/lib/constants'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Input, Select, Label } from '@/components/ui/field'
import { Alert, Badge, EmptyState } from '@/components/ui/misc'
import { initials } from '@/lib/utils'
import type { Invitation, OrgMemberWithProfile } from '@/lib/types'

export function TeamManager({
  members,
  invites,
  ownerId,
  currentUserId,
}: {
  members: OrgMemberWithProfile[]
  invites: Invitation[]
  ownerId: string
  currentUserId: string
}) {
  const router = useRouter()
  const invite = useAction()
  const rowAction = useAction()
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => setOrigin(window.location.origin), [])

  function submitInvite(formData: FormData) {
    invite.run(() => inviteMemberAction(formData), {
      onSuccess: () => router.refresh(),
    })
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${origin}/onboarding/invite/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Team</h1>

      {/* Invite */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <UserPlus className="h-4 w-4" /> Invite a member
        </h2>
        <form
          action={submitInvite}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="teammate@company.com"
            />
          </div>
          <div className="sm:w-40">
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue="member">
              {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={invite.pending}>
            Send invite
          </Button>
        </form>
        {invite.error && (
          <div className="mt-3">
            <Alert tone="red">{invite.error}</Alert>
          </div>
        )}
        {invite.success && (
          <div className="mt-3">
            <Alert tone="green">
              Invitation created. Share the link from the list below.
            </Alert>
          </div>
        )}
      </div>

      {rowAction.error && <Alert tone="red">{rowAction.error}</Alert>}

      {/* Members */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">
          Members ({members.length})
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {members.map((m) => {
              const isOwner = m.user_id === ownerId
              const isSelf = m.user_id === currentUserId
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {initials(m.profile?.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {m.profile?.full_name || 'Unnamed member'}
                      {isSelf && (
                        <span className="ml-1 text-xs text-zinc-400">(you)</span>
                      )}
                    </p>
                    {m.profile?.phone_number && (
                      <p className="truncate text-xs text-zinc-400">
                        {m.profile.phone_number}
                      </p>
                    )}
                  </div>

                  {isOwner ? (
                    <Badge tone="indigo">Owner</Badge>
                  ) : (
                    <Select
                      className="h-8 w-28 py-1 text-xs"
                      defaultValue={m.role}
                      onChange={(e) =>
                        rowAction.run(
                          () =>
                            updateMemberRoleAction(m.user_id, e.target.value),
                          { onSuccess: () => router.refresh() }
                        )
                      }
                    >
                      {ORG_ROLES.filter((r) => r !== 'owner').map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  )}

                  {!isOwner && (
                    <button
                      onClick={() => {
                        if (!confirm('Remove this member from the workspace?'))
                          return
                        rowAction.run(() => removeMemberAction(m.user_id), {
                          onSuccess: () => router.refresh(),
                        })
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Pending invites */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">
          Pending invitations
        </h2>
        {invites.length === 0 ? (
          <EmptyState title="No pending invitations" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <ul className="divide-y divide-zinc-100">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {inv.email}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {ROLE_LABELS[inv.role]}
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    {copied === inv.token ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      rowAction.run(() => revokeInviteAction(inv.id), {
                        onSuccess: () => router.refresh(),
                      })
                    }
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Revoke invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
