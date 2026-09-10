'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  Monitor,
  Camera,
  Loader2,
} from 'lucide-react'
import { loadSessionScreenshotsAction } from '@/lib/actions/activity'
import { cn } from '@/lib/utils'
import { Alert, ColorDot, EmptyState } from '@/components/ui/misc'
import {
  entryDurationMs,
  formatDuration,
  formatTimeOfDay,
  formatDayLabel,
} from '@/lib/time'
import type { ActivitySessionDetailed, Screenshot } from '@/lib/types'

type Shot = Screenshot & { url: string | null }

export function ActivityView({
  sessions,
  isManager,
  scope,
}: {
  sessions: ActivitySessionDetailed[]
  isManager: boolean
  scope: 'me' | 'all'
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Activity &amp; Screenshots
          </h1>
          <p className="text-sm text-zinc-500">
            Desktop tracker sessions · last 14 days
          </p>
        </div>
        {isManager && (
          <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 text-sm">
            {(['me', 'all'] as const).map((s) => (
              <Link
                key={s}
                href={s === 'all' ? '/activity?scope=all' : '/activity'}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-medium',
                  scope === s
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                {s === 'me' ? 'Mine' : 'Everyone'}
              </Link>
            ))}
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No tracker sessions yet"
          description="Start the desktop app, pick a project and task, and hit Start. Sessions and screenshots show up here."
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} showMember={scope === 'all'} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SessionCard({
  session,
  showMember,
}: {
  session: ActivitySessionDetailed
  showMember: boolean
}) {
  const [open, setOpen] = useState(false)
  const [shots, setShots] = useState<Shot[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const running = session.ended_at == null
  const duration = formatDuration(
    entryDurationMs(session.started_at, session.ended_at)
  )

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && shots === null && !loading) {
      setLoading(true)
      setError(null)
      const res = await loadSessionScreenshotsAction(session.id)
      if (res.ok) setShots(res.data ?? [])
      else setError(res.error)
      setLoading(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-zinc-50"
      >
        <Monitor className="h-4 w-4 shrink-0 text-zinc-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-zinc-900">
            {session.project ? (
              <span className="inline-flex items-center gap-1">
                <ColorDot color={session.project.color} />
                {session.project.name}
              </span>
            ) : (
              <span className="text-zinc-400">No project</span>
            )}
            {session.task && (
              <span className="text-zinc-500">/ {session.task.name}</span>
            )}
            {running && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                LIVE
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {showMember && session.profile?.full_name
              ? `${session.profile.full_name} · `
              : ''}
            {formatDayLabel(session.started_at)} ·{' '}
            {formatTimeOfDay(session.started_at)} –{' '}
            {session.ended_at ? formatTimeOfDay(session.ended_at) : 'now'}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-600">
          {duration}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          <Camera className="h-3 w-3" />
          {session.screenshot_count}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-zinc-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 p-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading screenshots…
            </div>
          )}
          {error && <Alert tone="red">{error}</Alert>}
          {shots && shots.length === 0 && !loading && (
            <p className="text-sm text-zinc-500">
              No screenshots captured in this session.
            </p>
          )}
          {shots && shots.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shots.map((shot) => (
                <a
                  key={shot.id}
                  href={shot.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white"
                >
                  {shot.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.url}
                      alt={`Screenshot ${formatTimeOfDay(shot.captured_at)}`}
                      loading="lazy"
                      className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center text-xs text-zinc-400">
                      unavailable
                    </div>
                  )}
                  <div className="px-2 py-1 text-[11px] tabular-nums text-zinc-500">
                    {formatTimeOfDay(shot.captured_at)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
