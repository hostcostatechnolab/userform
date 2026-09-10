import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getOrganizationDetail } from '@/lib/queries/admin'
import { ROLE_LABELS } from '@/lib/constants'
import { ActivityView } from '@/components/activity/ActivityView'
import { Badge, ColorDot } from '@/components/ui/misc'
import { Card, CardContent } from '@/components/ui/card'
import {
  entryDurationMs,
  formatDuration,
  formatDayLabel,
  formatTimeOfDay,
} from '@/lib/time'

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getOrganizationDetail(id)
  if (!detail) notFound()

  const { org, members, entries, sessions } = detail

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Organizations
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          {org.name}
        </h1>
        <p className="text-sm text-zinc-500">
          Created {formatDayLabel(org.created_at)} · {members.length} member(s)
        </p>
      </div>

      {/* Members */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">Members</h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="flex-1 font-medium text-zinc-900">
                  {m.full_name || 'Unnamed'}
                  {m.email && (
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {m.email}
                    </span>
                  )}
                </span>
                {m.deactivated_at && <Badge tone="red">Deactivated</Badge>}
                <Badge tone={m.role === 'owner' ? 'indigo' : 'zinc'}>
                  {ROLE_LABELS[m.role]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent time entries */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Recent time entries
          <span className="ml-2 font-normal text-zinc-400">last 30 days</span>
        </h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-zinc-500">None.</CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-2 text-zinc-500">
                      {formatDayLabel(e.started_at)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-zinc-800">
                      {formatTimeOfDay(e.started_at)} –{' '}
                      {e.ended_at ? formatTimeOfDay(e.ended_at) : 'now'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {e.profile?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      {e.project && (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <ColorDot color={e.project.color} />
                          {e.project.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-zinc-700">
                      {formatDuration(
                        entryDurationMs(e.started_at, e.ended_at)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Desktop activity + screenshots */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Desktop activity &amp; screenshots
          <span className="ml-2 font-normal text-zinc-400">last 30 days</span>
        </h2>
        <ActivityView
          sessions={sessions}
          isManager
          scope="all"
          embedded
        />
      </section>
    </div>
  )
}
