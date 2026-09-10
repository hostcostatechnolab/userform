import Link from 'next/link'
import { Building2, Users, Ban, ShieldCheck, Monitor, Clock } from 'lucide-react'
import { getAdminStats, listAllOrganizations } from '@/lib/queries/admin'
import { Card, CardContent } from '@/components/ui/card'
import { formatDayLabel } from '@/lib/time'

export default async function AdminOverviewPage() {
  const [stats, orgs] = await Promise.all([
    getAdminStats(),
    listAllOrganizations(),
  ])

  const tiles = [
    { label: 'Organizations', value: stats.organizations, icon: Building2 },
    { label: 'Users', value: stats.users, icon: Users },
    { label: 'Deactivated', value: stats.deactivated, icon: Ban },
    { label: 'Super admins', value: stats.superadmins, icon: ShieldCheck },
    { label: 'Sessions this week', value: stats.sessionsThisWeek, icon: Monitor },
    { label: 'Entries this week', value: stats.entriesThisWeek, icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <t.icon className="h-4 w-4 text-slate-400" />
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {t.value}
              </p>
              <p className="text-xs text-slate-500">{t.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Recent organizations
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {orgs.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/organizations/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="flex-1 font-medium text-slate-900">
                    {o.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {o.member_count} member(s) · {o.project_count} project(s)
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDayLabel(o.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
