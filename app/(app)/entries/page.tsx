import type { Metadata } from 'next'
import Link from 'next/link'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { getEntries } from '@/lib/queries/time'
import { listProjects } from '@/lib/queries/projects'
import { listMembers } from '@/lib/queries/team'
import { EntryList } from '@/components/entries/EntryList'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Time Entries' }

const RANGE_DAYS = 30

export default async function EntriesPage({
  searchParams,
}: PageProps<'/entries'>) {
  const user = await requireUser()
  const { org, isManager } = await requireMembership()
  const sp = await searchParams
  const scope = isManager && sp.scope === 'all' ? 'all' : 'me'

  const to = new Date()
  const from = new Date(to.getTime() - RANGE_DAYS * 24 * 60 * 60 * 1000)

  const [entries, projects, members] = await Promise.all([
    getEntries({
      orgId: org.id,
      from,
      to,
      userId: scope === 'all' ? undefined : user.id,
    }),
    listProjects(org.id),
    isManager ? listMembers(org.id) : Promise.resolve([]),
  ])

  const memberOptions = members.map((m) => ({
    user_id: m.user_id,
    name: m.profile?.full_name || 'Member',
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Time Entries
          </h1>
          <p className="text-sm text-zinc-500">Last {RANGE_DAYS} days</p>
        </div>

        {isManager && (
          <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 text-sm">
            {(['me', 'all'] as const).map((s) => (
              <Link
                key={s}
                href={s === 'all' ? '/entries?scope=all' : '/entries'}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-medium',
                  scope === s
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                {s === 'me' ? 'My entries' : 'Everyone'}
              </Link>
            ))}
          </div>
        )}
      </div>

      <EntryList
        entries={entries}
        projects={projects}
        members={memberOptions}
        showMember={scope === 'all'}
        groupByDay
        canAdd
      />
    </div>
  )
}
