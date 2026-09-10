import Link from 'next/link'
import { Clock } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-zinc-50 p-4">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-zinc-900"
      >
        <Clock className="h-5 w-5" />
        {APP_NAME}
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
