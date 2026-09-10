import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { getEntries } from '@/lib/queries/time'
import { Card } from '@/components/ui/card'
import { ColorDot } from '@/components/ui/misc'
import {
  addWeeks,
  startOfWeek,
  endOfWeek,
  weekDays,
  localDayKey,
  entryDurationMs,
  formatDuration,
  formatDateRange,
  formatTimeOfDay,
} from '@/lib/time'

export const metadata: Metadata = { title: 'Timesheet' }

export default async function TimesheetPage({
  searchParams,
}: PageProps<'/timesheet'>) {
  const user = await requireUser()
  const { org } = await requireMembership()
  const sp = await searchParams
  const offset = Number.parseInt(String(sp.w ?? '0'), 10) || 0

  const ref = addWeeks(new Date(), offset)
  const from = startOfWeek(ref)
  const to = endOfWeek(ref)
  const days = weekDays(ref)

  const entries = await getEntries({
    orgId: org.id,
    userId: user.id,
    from,
    to,
  })

  const byDay = new Map<string, typeof entries>()
  for (const e of entries) {
    const k = localDayKey(e.started_at)
    const list = byDay.get(k) ?? []
    list.push(e)
    byDay.set(k, list)
  }

  const weekTotal = entries.reduce(
    (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Timesheet
          </h1>
          <p className="text-sm text-zinc-500">
            {formatDateRange(
              from.toISOString(),
              new Date(to.getTime() - 1).toISOString()
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/timesheet?w=${offset - 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {offset !== 0 && (
            <Link
              href="/timesheet"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              This week
            </Link>
          )}
          <Link
            href={`/timesheet?w=${offset + 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="flex items-center justify-between p-5">
        <span className="text-sm font-semibold text-zinc-500">Week total</span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">
          {formatDuration(weekTotal)}
        </span>
      </Card>

      <div className="space-y-3">
        {days.map((day) => {
          const key = localDayKey(day.toISOString())
          const dayEntries = byDay.get(key) ?? []
          const dayTotal = dayEntries.reduce(
            (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
            0
          )
          const isToday = key === localDayKey(new Date().toISOString())

          return (
            <div
              key={key}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-zinc-700">
                  {day.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      Today
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-zinc-500 tabular-nums">
                  {dayEntries.length ? formatDuration(dayTotal) : '—'}
                </span>
              </div>
              {dayEntries.length > 0 && (
                <ul className="divide-y divide-zinc-100">
                  {dayEntries.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="tabular-nums text-zinc-800">
                        {formatTimeOfDay(e.started_at)} –{' '}
                        {e.ended_at ? formatTimeOfDay(e.ended_at) : 'now'}
                      </span>
                      {e.project && (
                        <span className="inline-flex flex-1 items-center gap-1.5 truncate text-zinc-500">
                          <ColorDot color={e.project.color} />
                          <span className="truncate">{e.project.name}</span>
                        </span>
                      )}
                      <span className="tabular-nums font-medium text-zinc-700">
                        {formatDuration(entryDurationMs(e.started_at, e.ended_at))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
