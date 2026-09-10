import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireManager } from '@/lib/queries/org'
import { getMonthlyTimesheet } from '@/lib/queries/attendance'
import { listProjects } from '@/lib/queries/projects'
import { signSelfies } from '@/lib/queries/photos'
import { MonthlyHeatmap } from '@/components/timesheets/MonthlyHeatmap'
import { Card } from '@/components/ui/card'
import { addMonths, formatDuration } from '@/lib/time'

export const metadata: Metadata = { title: 'Monthly Timesheet' }

export default async function MonthlyTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { org } = await requireManager()
  const sp = await searchParams
  const offset = Number.parseInt(String(sp.m ?? '0'), 10) || 0
  const ref = addMonths(new Date(), offset)

  const [sheet, projects] = await Promise.all([
    getMonthlyTimesheet({ orgId: org.id, ref }),
    listProjects(org.id),
  ])

  const photoUrls = await signSelfies(
    sheet.rows.flatMap((r) =>
      r.cells.flatMap((c) =>
        c.entries.flatMap((e) => [
          e.clock_in_photo_path,
          e.clock_out_photo_path,
        ])
      )
    )
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Monthly Timesheet
          </h1>
          <p className="text-sm text-zinc-500">{sheet.monthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/monthly?m=${offset - 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {offset !== 0 && (
            <Link
              href="/monthly"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              This month
            </Link>
          )}
          <Link
            href={`/monthly?m=${offset + 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="flex items-center justify-between p-5">
        <span className="text-sm font-semibold text-zinc-500">
          Team hours · {sheet.monthLabel}
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">
          {formatDuration(sheet.grandTotalMs)}
        </span>
      </Card>

      <MonthlyHeatmap
        monthLabel={sheet.monthLabel}
        days={sheet.days}
        rows={sheet.rows}
        dailyTotalsMs={sheet.dailyTotalsMs}
        projects={projects}
        photoUrls={photoUrls}
      />
    </div>
  )
}
