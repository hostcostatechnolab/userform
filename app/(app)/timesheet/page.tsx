import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { getEntries } from '@/lib/queries/time'
import { Card } from '@/components/ui/card'
import { ColorDot } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import {
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  weekDays,
  localDayKey,
  dayKeyOf,
  entryDurationMs,
  formatDuration,
  formatDateRange,
  formatMonthLabel,
  formatTimeOfDay,
  toDecimalHours,
} from '@/lib/time'
import type { TimeEntryDetailed } from '@/lib/types'

export const metadata: Metadata = { title: 'Timesheet' }

type Period = 'week' | 'month'

export default async function TimesheetPage({
  searchParams,
}: PageProps<'/timesheet'>) {
  const user = await requireUser()
  const { org } = await requireMembership()
  const sp = await searchParams
  const period: Period = sp.p === 'month' ? 'month' : 'week'
  const offset = Number.parseInt(String(sp.o ?? '0'), 10) || 0

  let from: Date
  let to: Date
  let days: Date[]
  let periodLabel: string

  if (period === 'month') {
    const ref = addMonths(new Date(), offset)
    const y = ref.getFullYear()
    const m = ref.getMonth()
    from = new Date(y, m, 1)
    to = new Date(y, m + 1, 1)
    const count = new Date(y, m + 1, 0).getDate()
    days = Array.from({ length: count }, (_, i) => new Date(y, m, i + 1))
    periodLabel = formatMonthLabel(from)
  } else {
    const ref = addWeeks(new Date(), offset)
    from = startOfWeek(ref)
    to = endOfWeek(ref)
    days = weekDays(ref)
    periodLabel = formatDateRange(
      from.toISOString(),
      new Date(to.getTime() - 1).toISOString()
    )
  }

  const entries = await getEntries({ orgId: org.id, userId: user.id, from, to })

  const byDay = new Map<string, TimeEntryDetailed[]>()
  for (const e of entries) {
    const k = localDayKey(e.started_at)
    const list = byDay.get(k) ?? []
    list.push(e)
    byDay.set(k, list)
  }

  const total = entries.reduce(
    (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
    0
  )

  // by-project breakdown
  const projMap = new Map<
    string,
    { name: string; color: string; ms: number }
  >()
  for (const e of entries) {
    const key = e.project?.id ?? 'none'
    const cur =
      projMap.get(key) ??
      {
        name: e.project?.name ?? 'No project',
        color: e.project?.color ?? '#a1a1aa',
        ms: 0,
      }
    cur.ms += entryDurationMs(e.started_at, e.ended_at)
    projMap.set(key, cur)
  }
  const projRows = [...projMap.values()].sort((a, b) => b.ms - a.ms)
  const projMax = Math.max(1, ...projRows.map((r) => r.ms))

  const nav = (p: Period, o: number) =>
    `/timesheet?p=${p}` + (o !== 0 ? `&o=${o}` : '')
  const todayKey = dayKeyOf(new Date())

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            My Timesheet
          </h1>
          <p className="text-sm text-zinc-500">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 text-sm">
            {(['week', 'month'] as const).map((p) => (
              <Link
                key={p}
                href={nav(p, 0)}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-medium capitalize',
                  period === p
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                {p}
              </Link>
            ))}
          </div>

          <Link
            href={nav(period, offset - 1)}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {offset !== 0 && (
            <Link
              href={nav(period, 0)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              This {period}
            </Link>
          )}
          <Link
            href={nav(period, offset + 1)}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="flex items-center justify-between p-5">
        <span className="text-sm font-semibold text-zinc-500 capitalize">
          {period} total
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">
          {formatDuration(total)}
          <span className="ml-2 text-sm font-normal text-zinc-400">
            {toDecimalHours(total)}h
          </span>
        </span>
      </Card>

      {projRows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700">
            By project
          </div>
          <ul className="divide-y divide-zinc-100">
            {projRows.map((r) => (
              <li key={r.name} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-zinc-900">
                    <ColorDot color={r.color} />
                    {r.name}
                  </span>
                  <span className="tabular-nums text-zinc-700">
                    {formatDuration(r.ms)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${(r.ms / projMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {days.map((day) => {
          const key = localDayKey(day.toISOString())
          const dayEntries = byDay.get(key) ?? []
          if (period === 'month' && dayEntries.length === 0) return null
          const dayTotal = dayEntries.reduce(
            (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
            0
          )
          const isToday = key === todayKey

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
                        {formatDuration(
                          entryDurationMs(e.started_at, e.ended_at)
                        )}
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
