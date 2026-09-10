'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import {
  addManualEntryAction,
  updateEntryAction,
  deleteEntryAction,
} from '@/lib/actions/time'
import { useAction } from '@/components/ui/use-action'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea, Label } from '@/components/ui/field'
import { Alert, EmptyState } from '@/components/ui/misc'
import {
  entryDurationMs,
  formatDuration,
  formatTimeOfDay,
  toDatetimeLocalValue,
} from '@/lib/time'
import type { Project, TimeEntryDetailed } from '@/lib/types'

function dayAt(dayKey: string, hour: number) {
  const d = new Date(`${dayKey}T00:00:00`)
  d.setHours(hour, 0, 0, 0)
  return toDatetimeLocalValue(d)
}

function SelfieThumb({ url, label }: { url?: string; label: string }) {
  if (!url) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[9px] font-medium text-zinc-300">
        {label}
      </span>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="shrink-0" title={`Clock ${label} selfie`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Clock ${label}`}
        className="h-9 w-9 rounded-lg object-cover ring-1 ring-zinc-200 transition-transform hover:scale-110"
      />
    </a>
  )
}

export function AttendanceDayDialog({
  open,
  onClose,
  member,
  dayKey,
  dayLabel,
  entries,
  projects,
  photoUrls = {},
}: {
  open: boolean
  onClose: () => void
  member: { userId: string; name: string }
  dayKey: string
  dayLabel: string
  entries: TimeEntryDetailed[]
  projects: Project[]
  photoUrls?: Record<string, string>
}) {
  const router = useRouter()
  const { pending, error, run, setError } = useAction()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<TimeEntryDetailed | null>(null)

  const [started, setStarted] = useState('')
  const [ended, setEnded] = useState('')
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setMode(entries.length === 0 ? 'form' : 'list')
    setEditing(null)
    setError(null)
    setStarted(dayAt(dayKey, 9))
    setEnded(dayAt(dayKey, 17))
    setProjectId('')
    setNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dayKey])

  function openForm(entry: TimeEntryDetailed | null) {
    setError(null)
    setEditing(entry)
    if (entry) {
      setStarted(toDatetimeLocalValue(entry.started_at))
      setEnded(toDatetimeLocalValue(entry.ended_at ?? new Date()))
      setProjectId(entry.project_id ?? '')
      setNote(entry.note ?? '')
    } else {
      setStarted(dayAt(dayKey, 9))
      setEnded(dayAt(dayKey, 17))
      setProjectId('')
      setNote('')
    }
    setMode('form')
  }

  function submit() {
    const fd = new FormData()
    if (editing) fd.set('id', editing.id)
    else fd.set('user_id', member.userId)
    fd.set('started_at', started)
    fd.set('ended_at', ended)
    fd.set('project_id', projectId)
    fd.set('note', note)

    run(() => (editing ? updateEntryAction(fd) : addManualEntryAction(fd)), {
      onSuccess: () => {
        router.refresh()
        if (entries.length === 0 && !editing) onClose()
        else setMode('list')
      },
    })
  }

  function remove(id: string) {
    if (!confirm('Delete this clock record?')) return
    run(() => deleteEntryAction(id), {
      onSuccess: () => {
        router.refresh()
        if (entries.length <= 1) onClose()
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member.name}
      description={dayLabel}
    >
      {error && (
        <div className="mb-3">
          <Alert tone="red">{error}</Alert>
        </div>
      )}

      {mode === 'list' ? (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <EmptyState title="No clock records for this day" />
          ) : (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <SelfieThumb
                    url={
                      e.clock_in_photo_path
                        ? photoUrls[e.clock_in_photo_path]
                        : undefined
                    }
                    label="in"
                  />
                  <SelfieThumb
                    url={
                      e.clock_out_photo_path
                        ? photoUrls[e.clock_out_photo_path]
                        : undefined
                    }
                    label="out"
                  />
                  <span className="flex-1 tabular-nums text-zinc-800">
                    {formatTimeOfDay(e.started_at)} –{' '}
                    {e.ended_at ? formatTimeOfDay(e.ended_at) : 'running'}
                  </span>
                  <span className="tabular-nums font-medium text-zinc-600">
                    {formatDuration(entryDurationMs(e.started_at, e.ended_at))}
                  </span>
                  <button
                    onClick={() => openForm(e)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" />
              Add clock time
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="att-start">Clock in</Label>
              <Input
                id="att-start"
                type="datetime-local"
                value={started}
                onChange={(e) => setStarted(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="att-end">Clock out</Label>
              <Input
                id="att-end"
                type="datetime-local"
                value={ended}
                onChange={(e) => setEnded(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="att-project">Project (optional)</Label>
            <Select
              id="att-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="att-note">Note (optional)</Label>
            <Textarea
              id="att-note"
              rows={2}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                entries.length === 0 ? onClose() : setMode('list')
              }
            >
              <ArrowLeft className="h-4 w-4" />
              {entries.length === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Button type="button" onClick={submit} loading={pending}>
              {editing ? 'Save changes' : 'Add record'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
