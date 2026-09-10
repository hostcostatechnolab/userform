import Link from 'next/link'
import { listAllOrganizations } from '@/lib/queries/admin'
import { formatDayLabel } from '@/lib/time'

export default async function AdminOrganizationsPage() {
  const orgs = await listAllOrganizations()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Organizations
        <span className="ml-2 text-sm font-normal text-slate-400">
          {orgs.length}
        </span>
      </h1>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Owner</th>
              <th className="px-4 py-2.5 text-right font-semibold">Members</th>
              <th className="px-4 py-2.5 text-right font-semibold">Projects</th>
              <th className="px-4 py-2.5 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  <Link
                    href={`/admin/organizations/${o.id}`}
                    className="hover:underline"
                  >
                    {o.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {o.owner_name || '—'}
                  {o.owner_email && (
                    <span className="block text-xs text-slate-400">
                      {o.owner_email}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {o.member_count}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {o.project_count}
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {formatDayLabel(o.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
