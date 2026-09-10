import Link from 'next/link'
import { listAllOrganizations } from '@/lib/queries/admin'
import { formatDayLabel } from '@/lib/time'

export default async function AdminOrganizationsPage() {
  const orgs = await listAllOrganizations()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Organizations
        <span className="ml-2 text-sm font-normal text-zinc-400">
          {orgs.length}
        </span>
      </h1>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-600">
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
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
              >
                <td className="px-4 py-2.5 font-medium text-zinc-900">
                  <Link
                    href={`/admin/organizations/${o.id}`}
                    className="hover:underline"
                  >
                    {o.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-zinc-600">
                  {o.owner_name || '—'}
                  {o.owner_email && (
                    <span className="block text-xs text-zinc-400">
                      {o.owner_email}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                  {o.member_count}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                  {o.project_count}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
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
