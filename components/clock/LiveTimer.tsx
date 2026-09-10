'use client'

import { useEffect, useState } from 'react'
import { entryDurationMs, formatClock } from '@/lib/time'

export function LiveTimer({
  startedAt,
  className,
}: {
  startedAt: string
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className} suppressHydrationWarning>
      {formatClock(entryDurationMs(startedAt, null, now))}
    </span>
  )
}
