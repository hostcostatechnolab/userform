import type { Metadata } from 'next'
import { requireManager } from '@/lib/queries/org'
import { listProjects } from '@/lib/queries/projects'
import { listTasks } from '@/lib/queries/tasks'
import { ProjectsManager } from '@/components/projects/ProjectsManager'
import type { Task } from '@/lib/types'

export const metadata: Metadata = { title: 'Projects & Tasks' }

export default async function ProjectsPage() {
  const { org } = await requireManager()

  const [projects, tasks] = await Promise.all([
    listProjects(org.id, { includeArchived: true }),
    listTasks(org.id, { includeArchived: true }),
  ])

  const tasksByProject: Record<string, Task[]> = {}
  for (const t of tasks) {
    ;(tasksByProject[t.project_id] ??= []).push(t)
  }

  return (
    <ProjectsManager projects={projects} tasksByProject={tasksByProject} />
  )
}
