'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AttendanceDayDialog } from '@/components/attendance/AttendanceDayDialog'
import {
  formatDuration,
  toDecimalHours,
  dayKeyOf,
} from '@/lib/time'
import type {
  MonthRow,
  MonthCell,
  MonthDayMeta,
} from '@/lib/queries/attendance'
import type { Project } from '@/lib/types'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Hours-only shade ramp. */
function cellClass(cell: MonthCell): string {
  if (cell.totalMs === 0) {
    return cell.isWeekend ? 'bg-zinc-50' : 'bg-zinc-100'
  }
  const h = cell.totalMs / 3_600_000
  if (h < 2) return 'bg-emerald-100'
  if (h < 4) return 'bg-emerald-200'
  if (h < 6) return 'bg-emerald-300'
  if (h < 8) return 'bg-emerald-400 text-white'
  return 'bg-emerald-500 text-white'
}

function csvCell(v: string | number) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function MonthlyHeatmap({
  monthLabel,
  days,
  rows,
  dailyTotalsMs,
  projects,
  photoUrls = {},
}: {
  monthLabel: string
  days: MonthDayMeta[]
  rows: MonthRow[]
  dailyTotalsMs: number[]
  projects: Project[]
  photoUrls?: Record<string, string>
}) {
  const [active, setActive] = useState<{ row: MonthRow; cell: MonthCell } | null>(
    null
  )
  const todayKey = dayKeyOf(new Date())

  function exportCsv() {
    const header = ['Member', ...days.map((d) => String(d.day)), 'Total']
    const body = rows.map((r) => [
      r.name,
      ...r.cells.map((c) => (c.totalMs ? toDecimalHours(c.totalMs) : '')),
      toDecimalHours(r.totalMs),
    ])
    const totalRow = [
      'Total',
      ...dailyTotalsMs.map((ms) => (ms ? toDecimalHours(ms) : '')),
      toDecimalHours(dailyTotalsMs.reduce((a, b) => a + b, 0)),
    ]
    const csv = [header, ...body, totalRow]
      .map((r) => r.map(csvCell).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly_timesheet_${monthLabel.replace(' ', '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-zinc-200 bg-white px-4 py-2 text-left font-semibold text-zinc-600">
                Member
              </th>
              {days.map((d) => (
                <th
                  key={d.dayKey}
                  className={`border-b border-zinc-200 px-0 py-1.5 text-center font-medium ${
                    d.isWeekend ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                  style={{ minWidth: 26 }}
                >
                  <div className="text-[10px] leading-tight">{DOW[d.dow]}</div>
                  <div
                    className={`leading-tight ${
                      d.dayKey === todayKey
                        ? 'font-bold text-emerald-600'
                        : ''
                    }`}
                  >
                    {d.day}
                  </div>
                </th>
              ))}
              <th className="sticky right-0 z-10 border-b border-l border-zinc-200 bg-white px-3 py-2 text-right font-semibold text-zinc-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="group">
                <td className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-4 py-1.5 font-medium text-zinc-900 group-hover:bg-zinc-50">
                  {row.name}
                </td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.dayKey}
                    className="border-b border-zinc-100 p-[2px] text-center"
                  >
                    <button
                      onClick={() => setActive({ row, cell })}
                      title={`${row.name} · ${cell.dayKey}${
                        cell.totalMs ? ` · ${formatDuration(cell.totalMs)}` : ''
                      }`}
                      className={`h-6 w-6 rounded-[5px] text-[9px] font-semibold tabular-nums transition-transform hover:scale-110 hover:ring-2 hover:ring-zinc-900/20 ${cellClass(
                        cell
                      )} ${
                        cell.dayKey === todayKey ? 'ring-1 ring-emerald-500' : ''
                      }`}
                    >
                      {cell.totalMs
                        ? Math.round(cell.totalMs / 3_600_000)
                        : ''}
                    </button>
                  </td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-zinc-100 bg-white px-3 py-1.5 text-right font-semibold tabular-nums text-zinc-800 group-hover:bg-zinc-50">
                  {formatDuration(row.totalMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>Fewer hours</span>
        <span className="h-4 w-4 rounded bg-zinc-100" />
        <span className="h-4 w-4 rounded bg-emerald-100" />
        <span className="h-4 w-4 rounded bg-emerald-200" />
        <span className="h-4 w-4 rounded bg-emerald-300" />
        <span className="h-4 w-4 rounded bg-emerald-400" />
        <span className="h-4 w-4 rounded bg-emerald-500" />
        <span>More · number = rounded hours · click a square to edit that day</span>
      </div>

      {active && (
        <AttendanceDayDialog
          open
          onClose={() => setActive(null)}
          member={{ userId: active.row.userId, name: active.row.name }}
          dayKey={active.cell.dayKey}
          dayLabel={new Date(
            active.cell.dayKey + 'T00:00:00'
          ).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          entries={active.cell.entries}
          projects={projects}
          photoUrls={photoUrls}
        />
      )}
    </>
  )
}
