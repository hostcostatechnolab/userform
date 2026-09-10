import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, BarChart3, Users, CalendarDays, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: Clock, title: 'One-tap clock in', body: 'Start and stop the timer from anywhere. Assign time to projects as you go.' },
  { icon: CalendarDays, title: 'Weekly timesheets', body: 'Every entry rolls up into daily and weekly totals you can correct in seconds.' },
  { icon: Users, title: 'Team management', body: 'Invite people, set roles, and see who is working right now across the org.' },
  { icon: BarChart3, title: 'Reports & export', body: 'Break hours down by member, project, or day and export to CSV for payroll.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <Clock className="h-5 w-5" />
          {APP_NAME}
        </span>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Time tracking &amp; attendance for teams
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Clock in, track hours against projects, and turn timesheets into
          payroll-ready reports — without the spreadsheet.
        </p>
        <Link href="/register" className="mt-8">
          <Button size="lg">
            Create your workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <Icon className="h-6 w-6 text-zinc-900" />
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{body}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
