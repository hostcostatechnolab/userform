import type { Metadata } from 'next'
import { requireManager, requireUser } from '@/lib/queries/org'
import { listMembers, listInvitations } from '@/lib/queries/team'
import { TeamManager } from '@/components/team/TeamManager'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage() {
  const user = await requireUser()
  const { org } = await requireManager()

  const [members, invites] = await Promise.all([
    listMembers(org.id),
    listInvitations(org.id),
  ])

  return (
    <TeamManager
      members={members}
      invites={invites}
      ownerId={org.owner_id}
      currentUserId={user.id}
    />
  )
}
