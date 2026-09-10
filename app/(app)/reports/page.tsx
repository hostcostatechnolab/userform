import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireManager } from '@/lib/queries/org'
import { getReport, type ReportGroupBy } from '@/lib/queries/reports'
import { ReportsView } from '@/components/reports/ReportsView'
import { Spinner } from '@/components/ui/misc'
import { localDayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Reports' }

const GROUP_OPTIONS: ReportGroupBy[] = ['member', 'project', 'day']

export default async function ReportsPage({
  searchParams,
}: PageProps<'/reports'>) {
  const { org } = await requireManager()
  const sp = await searchParams

  const today = new Date()
  const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const fromStr =
    typeof sp.from === 'string' && sp.from
      ? sp.from
      : localDayKey(defaultFrom.toISOString())
  const toStr =
    typeof sp.to === 'string' && sp.to
      ? sp.to
      : localDayKey(today.toISOString())
  const groupBy: ReportGroupBy =
    typeof sp.groupBy === 'string' &&
    GROUP_OPTIONS.includes(sp.groupBy as ReportGroupBy)
      ? (sp.groupBy as ReportGroupBy)
      : 'member'

  const from = new Date(`${fromStr}T00:00:00`)
  const to = new Date(`${toStr}T23:59:59.999`)

  const report = await getReport({ orgId: org.id, from, to, groupBy })

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <ReportsView
        rows={report.rows}
        totalMs={report.totalMs}
        entries={report.entries}
        from={fromStr}
        to={toStr}
        groupBy={groupBy}
      />
    </Suspense>
  )
}
