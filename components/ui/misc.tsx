import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-zinc-400', className)} />
}

type BadgeTone = 'zinc' | 'green' | 'amber' | 'red' | 'indigo'

const TONES: Record<BadgeTone, string> = {
  zinc: 'bg-zinc-100 text-zinc-600',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-700',
}

export function Badge({
  tone = 'zinc',
  className,
  ...props
}: { tone?: BadgeTone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}
