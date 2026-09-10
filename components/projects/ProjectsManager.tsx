'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ListChecks,
} from 'lucide-react'
import { setProjectArchivedAction } from '@/lib/actions/projects'
import { createTaskAction, setTaskArchivedAction } from '@/lib/actions/tasks'
import { useAction } from '@/components/ui/use-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Alert, EmptyState, ColorDot, Badge } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { ProjectFormDialog } from './ProjectFormDialog'
import type { Project, Task } from '@/lib/types'

export function ProjectsManager({
  projects,
  tasksByProject,
}: {
  projects: Project[]
  tasksByProject: Record<string, Task[]>
}) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)

  function toggleArchived(p: Project) {
    run(() => setProjectArchivedAction(p.id, !p.archived), {
      onSuccess: () => router.refresh(),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Projects &amp; Tasks
        </h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {error && <Alert tone="red">{error}</Alert>}

      {active.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project so your team can track time and tasks against it."
        />
      ) : (
        <div className="space-y-3">
          {active.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              tasks={tasksByProject[p.id] ?? []}
              onEdit={() => {
                setEditing(p)
                setOpen(true)
              }}
              onArchive={() => toggleArchived(p)}
              archiveDisabled={pending}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">
            Archived projects
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {archived.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <ColorDot color={p.color} />
                  <span className="flex-1 font-medium text-slate-500">
                    {p.name}
                  </span>
                  <Badge tone="zinc">Archived</Badge>
                  <button
                    onClick={() => toggleArchived(p)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Unarchive"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ProjectFormDialog
        open={open}
        onClose={() => setOpen(false)}
        project={editing}
      />
    </div>
  )
}

function ProjectCard({
  project,
  tasks,
  onEdit,
  onArchive,
  archiveDisabled,
}: {
  project: Project
  tasks: Task[]
  onEdit: () => void
  onArchive: () => void
  archiveDisabled: boolean
}) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const [expanded, setExpanded] = useState(false)
  const [newTask, setNewTask] = useState('')

  const activeTasks = tasks.filter((t) => !t.archived)
  const archivedTasks = tasks.filter((t) => t.archived)

  function addTask() {
    const name = newTask.trim()
    if (!name) return
    const fd = new FormData()
    fd.set('project_id', project.id)
    fd.set('name', name)
    run(() => createTaskAction(fd), {
      onSuccess: () => {
        setNewTask('')
        router.refresh()
      },
    })
  }

  function toggleTask(t: Task) {
    run(() => setTaskArchivedAction(t.id, !t.archived), {
      onSuccess: () => router.refresh(),
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <ColorDot color={project.color} />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left font-medium text-slate-900"
        >
          {project.name}
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            <ListChecks className="h-3 w-3" />
            {activeTasks.length}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Edit project"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onArchive}
          disabled={archiveDisabled}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Archive project"
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          {error && (
            <div className="mb-3">
              <Alert tone="red">{error}</Alert>
            </div>
          )}

          {activeTasks.length === 0 && archivedTasks.length === 0 ? (
            <p className="mb-3 text-sm text-slate-500">No tasks yet.</p>
          ) : (
            <ul className="mb-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {activeTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <span className="flex-1 text-slate-800">{t.name}</span>
                  <button
                    onClick={() => toggleTask(t)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    aria-label="Archive task"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {archivedTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <span className="flex-1 text-slate-400 line-through">
                    {t.name}
                  </span>
                  <button
                    onClick={() => toggleTask(t)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    aria-label="Unarchive task"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="New task name"
              maxLength={120}
              className="h-9"
            />
            <Button size="sm" onClick={addTask} loading={pending}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
