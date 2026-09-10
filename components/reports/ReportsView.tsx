'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, Label, Input } from '@/components/ui/field'
import { EmptyState, ColorDot } from '@/components/ui/misc'
import {
  entryDurationMs,
  formatDuration,
  toDecimalHours,
  localDayKey,
  formatTimeOfDay,
} from '@/lib/time'
import type { ReportGroupBy, ReportRow } from '@/lib/queries/reports'
import type { TimeEntryDetailed } from '@/lib/types'

function csvCell(value: string | number) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildCsv(entries: TimeEntryDetailed[]) {
  const header = [
    'Date',
    'Start',
    'End',
    'Hours',
    'Member',
    'Project',
    'Note',
    'Source',
  ]
  const rows = entries.map((e) => [
    localDayKey(e.started_at),
    formatTimeOfDay(e.started_at),
    e.ended_at ? formatTimeOfDay(e.ended_at) : '',
    toDecimalHours(entryDurationMs(e.started_at, e.ended_at)),
    e.profile?.full_name ?? '',
    e.project?.name ?? '',
    e.note ?? '',
    e.source,
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

export function ReportsView({
  rows,
  totalMs,
  entries,
  from,
  to,
  groupBy,
}: {
  rows: ReportRow[]
  totalMs: number
  entries: TimeEntryDetailed[]
  from: string
  to: string
  groupBy: ReportGroupBy
}) {
  const router = useRouter()
  const search = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(search.toString())
    params.set(key, value)
    router.push(`/reports?${params.toString()}`)
  }

  function downloadCsv() {
    const blob = new Blob([buildCsv(entries)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const max = Math.max(1, ...rows.map((r) => r.totalMs))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reports
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCsv}
          disabled={entries.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            defaultValue={from}
            onChange={(e) => setParam('from', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            defaultValue={to}
            onChange={(e) => setParam('to', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="groupBy">Group by</Label>
          <Select
            id="groupBy"
            defaultValue={groupBy}
            onChange={(e) => setParam('groupBy', e.target.value)}
          >
            <option value="member">Member</option>
            <option value="project">Project</option>
            <option value="day">Day</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
        <span className="text-sm font-semibold text-slate-500">Total hours</span>
        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {formatDuration(totalMs)}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No completed entries in this range"
          description="Adjust the dates or clock some time first."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.key} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    {row.color && <ColorDot color={row.color} />}
                    {row.label}
                  </span>
                  <span className="tabular-nums text-slate-700">
                    {formatDuration(row.totalMs)}
                    <span className="ml-2 text-xs text-slate-400">
                      {toDecimalHours(row.totalMs)}h
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${(row.totalMs / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
