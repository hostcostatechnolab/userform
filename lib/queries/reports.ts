import 'server-only'
import { getEntries } from './time'
import { entryDurationMs, localDayKey, formatDayLabel } from '@/lib/time'
import type { TimeEntryDetailed } from '@/lib/types'

export type ReportGroupBy = 'member' | 'project' | 'day'

export interface ReportRow {
  key: string
  label: string
  color?: string
  totalMs: number
  entryCount: number
}

export interface Report {
  rows: ReportRow[]
  totalMs: number
  entries: TimeEntryDetailed[]
}

function groupKey(entry: TimeEntryDetailed, groupBy: ReportGroupBy) {
  switch (groupBy) {
    case 'member':
      return {
        key: entry.user_id,
        label: entry.profile?.full_name?.trim() || 'Unknown member',
      }
    case 'project':
      return {
        key: entry.project?.id ?? 'none',
        label: entry.project?.name ?? 'No project',
        color: entry.project?.color,
      }
    case 'day': {
      const key = localDayKey(entry.started_at)
      return { key, label: formatDayLabel(entry.started_at) }
    }
  }
}

export async function getReport({
  orgId,
  from,
  to,
  groupBy,
  userId,
  projectId,
}: {
  orgId: string
  from: Date
  to: Date
  groupBy: ReportGroupBy
  userId?: string
  projectId?: string
}): Promise<Report> {
  const all = await getEntries({ orgId, from, to, userId, projectId })
  // Reports only count completed entries.
  const entries = all.filter((e) => e.ended_at != null)

  const map = new Map<string, ReportRow>()
  let totalMs = 0

  for (const entry of entries) {
    const ms = entryDurationMs(entry.started_at, entry.ended_at)
    totalMs += ms
    const { key, label, color } = groupKey(entry, groupBy)
    const existing = map.get(key)
    if (existing) {
      existing.totalMs += ms
      existing.entryCount += 1
    } else {
      map.set(key, { key, label, color, totalMs: ms, entryCount: 1 })
    }
  }

  const rows = [...map.values()].sort((a, b) =>
    groupBy === 'day' ? a.key.localeCompare(b.key) : b.totalMs - a.totalMs
  )

  return { rows, totalMs, entries }
}
