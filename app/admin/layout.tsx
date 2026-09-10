import type { Metadata } from 'next'
import { requireSuperadmin } from '@/lib/queries/org'
import { AdminNav } from '@/components/admin/AdminNav'

export const metadata: Metadata = { title: 'Super Admin' }

export default async function AdminLayout({ children }: LayoutProps<'/'>) {
  await requireSuperadmin()

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}
