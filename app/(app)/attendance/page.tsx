import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireManager } from '@/lib/queries/org'
import { getAttendanceGrid } from '@/lib/queries/attendance'
import { listProjects } from '@/lib/queries/projects'
import { signSelfies } from '@/lib/queries/photos'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { Card } from '@/components/ui/card'
import {
  addWeeks,
  startOfWeek,
  endOfWeek,
  formatDateRange,
  formatDuration,
} from '@/lib/time'

export const metadata: Metadata = { title: 'Attendance' }

export default async function AttendancePage({
  searchParams,
}: PageProps<'/attendance'>) {
  const { org } = await requireManager()
  const sp = await searchParams
  const offset = Number.parseInt(String(sp.w ?? '0'), 10) || 0
  const ref = addWeeks(new Date(), offset)

  const [grid, projects] = await Promise.all([
    getAttendanceGrid({ orgId: org.id, ref }),
    listProjects(org.id),
  ])

  const from = startOfWeek(ref)
  const to = endOfWeek(ref)
  const orgTotal = grid.rows.reduce((s, r) => s + r.totalMs, 0)

  const photoUrls = await signSelfies(
    grid.rows.flatMap((r) =>
      r.cells.flatMap((c) =>
        c.entries.flatMap((e) => [
          e.clock_in_photo_path,
          e.clock_out_photo_path,
        ])
      )
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Attendance
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
            href={`/attendance?w=${offset - 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {offset !== 0 && (
            <Link
              href="/attendance"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              This week
            </Link>
          )}
          <Link
            href={`/attendance?w=${offset + 1}`}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="flex items-center justify-between p-5">
        <span className="text-sm font-semibold text-zinc-500">
          Team hours this week
        </span>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">
          {formatDuration(orgTotal)}
        </span>
      </Card>

      <AttendanceGrid
        days={grid.days}
        rows={grid.rows}
        projects={projects}
        photoUrls={photoUrls}
      />
    </div>
  )
}
