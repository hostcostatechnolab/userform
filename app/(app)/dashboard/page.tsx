import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { getEntries, getRunningEntry } from '@/lib/queries/time'
import { listProjects } from '@/lib/queries/projects'
import { ClockCard } from '@/components/clock/ClockCard'
import { EntryList } from '@/components/entries/EntryList'
import { Card, CardContent } from '@/components/ui/card'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from '@/lib/time'
import { entryDurationMs, formatDuration } from '@/lib/time'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireUser()
  const { org, isManager } = await requireMembership()

  const supabase = await createClient()
  const now = new Date()
  const [running, todayEntries, weekEntries, projects, profileRes] =
    await Promise.all([
    getRunningEntry(org.id, user.id),
    getEntries({
      orgId: org.id,
      userId: user.id,
      from: startOfDay(now),
      to: endOfDay(now),
    }),
    getEntries({
      orgId: org.id,
      userId: user.id,
      from: startOfWeek(now),
      to: endOfWeek(now),
    }),
    listProjects(org.id),
    supabase
      .from('profiles')
      .select('face_descriptor')
      .eq('id', user.id)
      .maybeSingle<{ face_descriptor: number[] | number[][] | null }>(),
  ])

  const faceDescriptor = profileRes.data?.face_descriptor ?? null

  const sum = (list: typeof todayEntries) =>
    list.reduce((s, e) => s + entryDurationMs(e.started_at, e.ended_at), 0)

  const todayMs = sum(todayEntries)
  const weekMs = sum(weekEntries)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Dashboard
      </h1>

      <ClockCard
        running={running}
        projects={projects}
        faceDescriptor={faceDescriptor}
        userId={user.id}
        orgId={org.id}
        geofence={{
          enabled: org.geofence_enabled,
          lat: org.geofence_lat,
          lng: org.geofence_lng,
          radiusM: org.geofence_radius_m,
          label: org.geofence_label,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Today
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900">
              {formatDuration(todayMs)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              This week
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900">
              {formatDuration(weekMs)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          Today&apos;s entries
        </h2>
        <EntryList
          entries={todayEntries}
          projects={projects}
          canManage={isManager}
        />
      </div>
    </div>
  )
}
