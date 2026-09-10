import { requireSuperadmin } from '@/lib/queries/org'
import { listAllUsers } from '@/lib/queries/admin'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function AdminUsersPage() {
  const viewer = await requireSuperadmin()
  const users = await listAllUsers()

  return <UsersTable users={users} currentUserId={viewer.id} />
}
