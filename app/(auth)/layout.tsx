import Link from 'next/link'
import { Clock } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2.5 text-sm font-semibold text-slate-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/30">
          <Clock className="h-5 w-5" />
        </span>
        {APP_NAME}
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur">
        {children}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        {APP_NAME} · time &amp; attendance
      </p>
    </div>
  )
}
