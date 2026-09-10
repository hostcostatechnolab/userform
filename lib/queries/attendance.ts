import 'server-only'
import { getEntries } from './time'
import { listMembers } from './team'
import {
  entryDurationMs,
  localDayKey,
  weekDays,
  dayKeyOf,
  formatMonthLabel,
} from '@/lib/time'
import type { TimeEntryDetailed } from '@/lib/types'

export type DayStatus = 'present' | 'absent' | 'off'

export interface AttendanceCell {
  dayKey: string
  isWeekend: boolean
  status: DayStatus
  count: number
  firstIn: string | null
  lastOut: string | null
  totalMs: number
  entries: TimeEntryDetailed[]
}

export interface AttendanceRow {
  userId: string
  name: string
  cells: AttendanceCell[]
  totalMs: number
  presentDays: number
}

export interface AttendanceGrid {
  days: string[] // ISO datetimes, Mon..Sun
  rows: AttendanceRow[]
}

/**
 * One row per member, one cell per day in the week containing `ref`.
 * "Absent" = a non-weekend day with no time entries.
 */
export async function getAttendanceGrid({
  orgId,
  ref,
}: {
  orgId: string
  ref: Date
}): Promise<AttendanceGrid> {
  const days = weekDays(ref)
  const from = days[0]
  const to = new Date(days[6])
  to.setDate(to.getDate() + 1) // exclusive end

  const [members, entries] = await Promise.all([
    listMembers(orgId),
    getEntries({ orgId, from, to }),
  ])

  // index entries by user -> dayKey
  const byUserDay = new Map<string, Map<string, TimeEntryDetailed[]>>()
  for (const e of entries) {
    const dayKey = localDayKey(e.started_at)
    let userMap = byUserDay.get(e.user_id)
    if (!userMap) {
      userMap = new Map()
      byUserDay.set(e.user_id, userMap)
    }
    const list = userMap.get(dayKey) ?? []
    list.push(e)
    userMap.set(dayKey, list)
  }

  const dayMeta = days.map((d) => {
    const dow = d.getDay()
    return { key: localDayKey(d.toISOString()), isWeekend: dow === 0 || dow === 6 }
  })

  const rows: AttendanceRow[] = members.map((m) => {
    const userMap = byUserDay.get(m.user_id)
    let totalMs = 0
    let presentDays = 0

    const cells: AttendanceCell[] = dayMeta.map(({ key, isWeekend }) => {
      const dayEntries = (userMap?.get(key) ?? []).slice().sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      )
      const dayMs = dayEntries.reduce(
        (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
        0
      )
      totalMs += dayMs

      let status: DayStatus
      if (dayEntries.length > 0) {
        status = 'present'
        presentDays += 1
      } else if (isWeekend) {
        status = 'off'
      } else {
        status = 'absent'
      }

      const ended = dayEntries
        .map((e) => e.ended_at)
        .filter((v): v is string => v != null)

      return {
        dayKey: key,
        isWeekend,
        status,
        count: dayEntries.length,
        firstIn: dayEntries[0]?.started_at ?? null,
        lastOut: ended.length
          ? ended.reduce((a, b) => (a > b ? a : b))
          : null,
        totalMs: dayMs,
        entries: dayEntries,
      }
    })

    return {
      userId: m.user_id,
      name: m.profile?.full_name?.trim() || 'Unnamed member',
      cells,
      totalMs,
      presentDays,
    }
  })

  return { days: days.map((d) => d.toISOString()), rows }
}

// ===========================================================================
// Monthly heatmap timesheet — member × day-of-month, shaded by hours worked
// ===========================================================================

export interface MonthDayMeta {
  day: number
  dayKey: string
  dow: number
  isWeekend: boolean
}

export interface MonthCell {
  dayKey: string
  day: number
  isWeekend: boolean
  totalMs: number
  count: number
  entries: TimeEntryDetailed[]
}

export interface MonthRow {
  userId: string
  name: string
  cells: MonthCell[]
  totalMs: number
}

export interface MonthlyTimesheet {
  monthLabel: string
  days: MonthDayMeta[]
  rows: MonthRow[]
  grandTotalMs: number
  dailyTotalsMs: number[]
}

export async function getMonthlyTimesheet({
  orgId,
  ref,
}: {
  orgId: string
  ref: Date
}): Promise<MonthlyTimesheet> {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 1) // exclusive

  const [members, entries] = await Promise.all([
    listMembers(orgId),
    getEntries({ orgId, from, to }),
  ])

  const days: MonthDayMeta[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1)
    const dow = d.getDay()
    return {
      day: i + 1,
      dayKey: dayKeyOf(d),
      dow,
      isWeekend: dow === 0 || dow === 6,
    }
  })

  const byUserDay = new Map<string, Map<string, TimeEntryDetailed[]>>()
  for (const e of entries) {
    const key = localDayKey(e.started_at)
    let userMap = byUserDay.get(e.user_id)
    if (!userMap) {
      userMap = new Map()
      byUserDay.set(e.user_id, userMap)
    }
    const list = userMap.get(key) ?? []
    list.push(e)
    userMap.set(key, list)
  }

  const dailyTotalsMs: number[] = new Array(daysInMonth).fill(0)
  let grandTotalMs = 0

  const rows: MonthRow[] = members.map((m) => {
    const userMap = byUserDay.get(m.user_id)
    let totalMs = 0

    const cells: MonthCell[] = days.map((meta, idx) => {
      const dayEntries = (userMap?.get(meta.dayKey) ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        )
      const dayMs = dayEntries.reduce(
        (s, e) => s + entryDurationMs(e.started_at, e.ended_at),
        0
      )
      totalMs += dayMs
      dailyTotalsMs[idx] += dayMs

      return {
        dayKey: meta.dayKey,
        day: meta.day,
        isWeekend: meta.isWeekend,
        totalMs: dayMs,
        count: dayEntries.length,
        entries: dayEntries,
      }
    })

    grandTotalMs += totalMs
    return {
      userId: m.user_id,
      name: m.profile?.full_name?.trim() || 'Unnamed member',
      cells,
      totalMs,
    }
  })

  return {
    monthLabel: formatMonthLabel(from),
    days,
    rows,
    grandTotalMs,
    dailyTotalsMs,
  }
}
