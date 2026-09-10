'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createProjectAction,
  updateProjectAction,
} from '@/lib/actions/projects'
import { PROJECT_COLORS } from '@/lib/constants'
import { useAction } from '@/components/ui/use-action'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

export function ProjectFormDialog({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
}) {
  const router = useRouter()
  const { pending, error, run, setError } = useAction()
  const isEdit = Boolean(project)

  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(project?.name ?? '')
    setColor(project?.color ?? PROJECT_COLORS[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project])

  function submit() {
    const fd = new FormData()
    if (isEdit && project) fd.set('id', project.id)
    fd.set('name', name)
    fd.set('color', color)
    run(() => (isEdit ? updateProjectAction(fd) : createProjectAction(fd)), {
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
      title={isEdit ? 'Edit project' : 'New project'}
    >
      <div className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <div>
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Website redesign"
            autoFocus
            maxLength={80}
          />
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform',
                  color === c
                    ? 'scale-110 border-slate-900'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Select ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
