import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-blue-500', className)} />
}

type BadgeTone = 'zinc' | 'green' | 'amber' | 'red' | 'indigo'

const TONES: Record<BadgeTone, string> = {
  zinc: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  red: 'bg-red-50 text-red-600 ring-red-500/20',
  indigo: 'bg-blue-50 text-blue-700 ring-blue-500/20',
}

export function Badge({
  tone = 'zinc',
  className,
  ...props
}: { tone?: BadgeTone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}

export function Alert({
  tone = 'red',
  children,
}: {
  tone?: 'red' | 'green'
  children: React.ReactNode
}) {
  if (!children) return null
  return (
    <div
      className={cn(
        'rounded-xl border p-3 text-sm',
        tone === 'red'
          ? 'border-red-100 bg-red-50 text-red-600'
          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
      )}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-black/5"
      style={{ backgroundColor: color }}
    />
  )
}
