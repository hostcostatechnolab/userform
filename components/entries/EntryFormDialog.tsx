'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addManualEntryAction,
  updateEntryAction,
} from '@/lib/actions/time'
import { useAction } from '@/components/ui/use-action'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea, Label, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { toDatetimeLocalValue } from '@/lib/time'
import type { Project, TimeEntryDetailed } from '@/lib/types'

interface MemberOption {
  user_id: string
  name: string
}

export function EntryFormDialog({
  open,
  onClose,
  entry,
  projects,
  members,
}: {
  open: boolean
  onClose: () => void
  entry?: TimeEntryDetailed | null
  projects: Project[]
  /** Provided only for managers, to log time on behalf of a member. */
  members?: MemberOption[]
}) {
  const router = useRouter()
  const { pending, error, run, setError } = useAction()
  const isEdit = Boolean(entry)

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const [started, setStarted] = useState('')
  const [ended, setEnded] = useState('')
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setStarted(
      toDatetimeLocalValue(entry ? entry.started_at : oneHourAgo)
    )
    setEnded(toDatetimeLocalValue(entry?.ended_at ?? now))
    setProjectId(entry?.project_id ?? '')
    setNote(entry?.note ?? '')
    setUserId(entry?.user_id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry])

  function submit() {
    const fd = new FormData()
    if (isEdit && entry) fd.set('id', entry.id)
    fd.set('started_at', started)
    fd.set('ended_at', ended)
    fd.set('project_id', projectId)
    fd.set('note', note)
    if (!isEdit && userId) fd.set('user_id', userId)

    run(() => (isEdit ? updateEntryAction(fd) : addManualEntryAction(fd)), {
      onSuccess: () => {
        onClose()
        router.refresh()
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit time entry' : 'Add time entry'}
      description="Times are in your local timezone."
    >
      <div className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="started_at">Start</Label>
            <Input
              id="started_at"
              type="datetime-local"
              value={started}
              onChange={(e) => setStarted(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ended_at">End</Label>
            <Input
              id="ended_at"
              type="datetime-local"
              value={ended}
              onChange={(e) => setEnded(e.target.value)}
            />
          </div>
        </div>

        {members && members.length > 0 && !isEdit && (
          <div>
            <Label htmlFor="user_id">Team member</Label>
            <Select
              id="user_id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Me</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="project_id">Project</Label>
          <Select
            id="project_id"
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
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            rows={2}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
          <FieldError />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} type="button">
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
