import type { Metadata } from 'next'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { listSessions } from '@/lib/queries/activity'
import { ActivityView } from '@/components/activity/ActivityView'

export const metadata: Metadata = { title: 'Activity & Screenshots' }

const WINDOW_DAYS = 14

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUser()
  const { org, isManager } = await requireMembership()
  const sp = await searchParams
  const scope = isManager && sp.scope === 'all' ? 'all' : 'me'

  const to = new Date()
  const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const sessions = await listSessions({
    orgId: org.id,
    from,
    to,
    userId: scope === 'all' ? undefined : user.id,
  })

  return (
    <ActivityView sessions={sessions} isManager={isManager} scope={scope} />
  )
}
