import { OrgSwitcher } from './OrgSwitcher'
import { UserMenu } from './UserMenu'
import type { Membership } from '@/lib/types'

export function Topbar({
  membership,
  name,
  email,
}: {
  membership: Membership
  name: string | null
  email: string | null
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <OrgSwitcher membership={membership} />
      <UserMenu name={name} email={email} />
    </header>
  )
}
