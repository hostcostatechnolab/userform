import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Clock,
  BarChart3,
  Users,
  CalendarDays,
  ArrowRight,
  ScanFace,
  MapPin,
  Monitor,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: ScanFace, title: 'Face-verified clock in', body: 'A live face scan confirms who’s punching — no buddy punching.' },
  { icon: MapPin, title: 'Geofenced attendance', body: 'Members can only clock in when they’re at the work location.' },
  { icon: CalendarDays, title: 'Weekly & monthly reports', body: 'Every entry rolls up into per-day, per-project and payroll totals.' },
  { icon: Monitor, title: 'Desktop activity tracker', body: 'Optional screenshot tracking against a project and task.' },
  { icon: Users, title: 'Teams & roles', body: 'Invite people, set owner / admin / member, manage every workspace.' },
  { icon: BarChart3, title: 'Exports', body: 'Attendance grids and reports export to CSV in a click.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Clock className="h-5 w-5" />
          </span>
          {APP_NAME}
        </span>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Face recognition · Geofencing · Screenshots
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
          Attendance that{' '}
          <span className="text-gradient">actually verifies</span> who&apos;s
          working
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-600">
          Clock in with a face scan from inside the office geofence. Roll it up
          into weekly, monthly and payroll-ready reports — without the
          spreadsheet.
        </p>
        <Link href="/register" className="mt-8">
          <Button size="lg">
            Create your workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.15)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{body}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
