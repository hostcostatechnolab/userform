'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDuration, formatTimeOfDay } from '@/lib/time'
import { Badge } from '@/components/ui/misc'
import { AttendanceDayDialog } from './AttendanceDayDialog'
import type { AttendanceRow, AttendanceCell } from '@/lib/queries/attendance'
import type { Project } from '@/lib/types'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AttendanceGrid({
  days,
  rows,
  projects,
  photoUrls = {},
}: {
  days: string[]
  rows: AttendanceRow[]
  projects: Project[]
  photoUrls?: Record<string, string>
}) {
  const [active, setActive] = useState<{
    row: AttendanceRow
    cell: AttendanceCell
  } | null>(null)

  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
              <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-2.5 font-semibold text-zinc-600">
                Member
              </th>
              {days.map((iso) => {
                const d = new Date(iso)
                const key = iso.slice(0, 10)
                return (
                  <th
                    key={iso}
                    className={cn(
                      'px-2 py-2.5 text-center font-semibold',
                      key === todayKey ? 'text-zinc-900' : 'text-zinc-500'
                    )}
                  >
                    <div>{DOW[d.getDay()]}</div>
                    <div className="text-xs font-normal text-zinc-400">
                      {d.getDate()}
                    </div>
                  </th>
                )
              })}
              <th className="px-3 py-2.5 text-right font-semibold text-zinc-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-b border-zinc-100 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-zinc-900">
                  {row.name}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {row.presentDays}d
                  </span>
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.dayKey} className="px-1.5 py-1.5 text-center">
                    <button
                      onClick={() => setActive({ row, cell })}
                      className={cn(
                        'flex w-full min-w-[76px] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1.5 transition-colors',
                        cell.status === 'present' &&
                          'border-emerald-100 bg-emerald-50 hover:bg-emerald-100',
                        cell.status === 'absent' &&
                          'border-red-100 bg-red-50 hover:bg-red-100',
                        cell.status === 'off' &&
                          'border-transparent bg-zinc-50 text-zinc-300 hover:bg-zinc-100'
                      )}
                    >
                      {cell.status === 'present' ? (
                        <>
                          <span className="text-[11px] font-semibold tabular-nums text-emerald-800">
                            {formatDuration(cell.totalMs)}
                          </span>
                          <span className="text-[10px] tabular-nums text-emerald-600">
                            {cell.firstIn ? formatTimeOfDay(cell.firstIn) : '--'}
                            {cell.lastOut
                              ? `–${formatTimeOfDay(cell.lastOut)}`
                              : cell.count
                                ? '–…'
                                : ''}
                          </span>
                        </>
                      ) : cell.status === 'absent' ? (
                        <span className="text-[11px] font-semibold text-red-600">
                          Absent
                        </span>
                      ) : (
                        <span className="text-[11px]">Off</span>
                      )}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-zinc-800">
                  {formatDuration(row.totalMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Badge tone="green">Present</Badge> has clock records
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone="red">Absent</Badge> weekday, no records
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone="zinc">Off</Badge> weekend
        </span>
        <span>· Click any cell to add or edit clock times</span>
      </div>

      {active && (
        <AttendanceDayDialog
          open
          onClose={() => setActive(null)}
          member={{ userId: active.row.userId, name: active.row.name }}
          dayKey={active.cell.dayKey}
          dayLabel={new Date(active.cell.dayKey + 'T00:00:00').toLocaleDateString(
            undefined,
            { weekday: 'long', month: 'long', day: 'numeric' }
          )}
          entries={active.cell.entries}
          projects={projects}
          photoUrls={photoUrls}
        />
      )}
    </>
  )
}
