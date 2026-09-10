'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { deleteEntryAction } from '@/lib/actions/time'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Alert, ColorDot, EmptyState, Badge } from '@/components/ui/misc'
import { EntryFormDialog } from './EntryFormDialog'
import {
  entryDurationMs,
  formatDuration,
  formatTimeOfDay,
  formatDayLabel,
  localDayKey,
} from '@/lib/time'
import type { Project, TimeEntryDetailed } from '@/lib/types'

interface Props {
  entries: TimeEntryDetailed[]
  projects: Project[]
  members?: { user_id: string; name: string }[]
  showMember?: boolean
  groupByDay?: boolean
  /** Owners/admins only: shows Add + per-row edit/delete. Members get a read-only list. */
  canManage?: boolean
}

export function EntryList({
  entries,
  projects,
  members,
  showMember = false,
  groupByDay = false,
  canManage = false,
}: Props) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TimeEntryDetailed | null>(null)

  const groups = useMemo(() => {
    if (!groupByDay) return [{ key: 'all', label: '', items: entries }]
    const map = new Map<string, TimeEntryDetailed[]>()
    for (const e of entries) {
      const k = localDayKey(e.started_at)
      const list = map.get(k) ?? []
      list.push(e)
      map.set(k, list)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: formatDayLabel(items[0].started_at),
        items,
      }))
  }, [entries, groupByDay])

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(entry: TimeEntryDetailed) {
    setEditing(entry)
    setDialogOpen(true)
  }
  function remove(id: string) {
    if (!confirm('Delete this time entry?')) return
    run(() => deleteEntryAction(id), { onSuccess: () => router.refresh() })
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        </div>
      )}

      {error && <Alert tone="red">{error}</Alert>}

      {entries.length === 0 ? (
        <EmptyState
          title="No time entries"
          description={
            canManage
              ? 'Clock in from the dashboard or add one manually.'
              : 'Clock in from the dashboard to start tracking.'
          }
          action={
            canManage ? (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add entry
              </Button>
            ) : undefined
          }
        />
      ) : (
        groups.map((group) => {
          const dayTotal = group.items.reduce(
            (sum, e) => sum + entryDurationMs(e.started_at, e.ended_at),
            0
          )
          return (
            <div key={group.key} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {group.label && (
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                  <span className="text-sm font-semibold text-zinc-700">
                    {group.label}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">
                    {formatDuration(dayTotal)}
                  </span>
                </div>
              )}
              <ul className="divide-y divide-zinc-100">
                {group.items.map((entry) => {
                  const open = entry.ended_at == null
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium tabular-nums text-zinc-900">
                            {formatTimeOfDay(entry.started_at)} –{' '}
                            {entry.ended_at
                              ? formatTimeOfDay(entry.ended_at)
                              : 'now'}
                          </span>
                          {entry.project && (
                            <span className="inline-flex items-center gap-1 text-zinc-500">
                              <ColorDot color={entry.project.color} />
                              {entry.project.name}
                            </span>
                          )}
                          {open && <Badge tone="green">Running</Badge>}
                          {entry.source === 'manual' && (
                            <Badge tone="zinc">Manual</Badge>
                          )}
                        </div>
                        {(entry.note || (showMember && entry.profile)) && (
                          <p className="mt-0.5 truncate text-xs text-zinc-400">
                            {showMember && entry.profile?.full_name
                              ? `${entry.profile.full_name}${entry.note ? ' · ' : ''}`
                              : ''}
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <span className="w-16 shrink-0 text-right font-medium tabular-nums text-zinc-700">
                        {formatDuration(
                          entryDurationMs(entry.started_at, entry.ended_at)
                        )}
                      </span>
                      {canManage && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEdit(entry)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(entry.id)}
                            disabled={pending}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })
      )}

      <EntryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entry={editing}
        projects={projects}
        members={members}
      />
    </div>
  )
}
