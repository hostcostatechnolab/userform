import { requireMembership } from '@/lib/queries/org'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

export default async function SettingsLayout({ children }: LayoutProps<'/'>) {
  const { isManager } = await requireMembership()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Settings
      </h1>
      <SettingsTabs isManager={isManager} />
      {children}
    </div>
  )
}
