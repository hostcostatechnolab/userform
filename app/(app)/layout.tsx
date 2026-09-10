import { createClient } from '@/lib/supabase/server'
import { requireMembership, requireUser } from '@/lib/queries/org'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { MobileNav } from '@/components/shell/MobileNav'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const membership = await requireMembership()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  const isSuperadmin = Boolean(profile?.is_superadmin)

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar isManager={membership.isManager} isSuperadmin={isSuperadmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          membership={membership}
          name={profile?.full_name ?? null}
          email={user.email ?? null}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
        <MobileNav isManager={membership.isManager} />
      </div>
    </div>
  )
}
