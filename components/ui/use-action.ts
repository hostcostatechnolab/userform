'use client'

import { useState, useTransition } from 'react'
import type { ActionResult } from '@/lib/action-result'

type Runnable = () => Promise<ActionResult<unknown> | void>

/**
 * Wraps a server action call with pending / error / success state.
 * `run` swallows the redirect() "error" that Next throws on navigation.
 */
export function useAction() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function run(fn: Runnable, opts?: { onSuccess?: () => void }) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        const res = await fn()
        if (res && res.ok === false) {
          setError(res.error)
          return
        }
        setSuccess(true)
        opts?.onSuccess?.()
      } catch (e) {
        if (e && typeof e === 'object' && 'digest' in e) {
          const digest = String((e as { digest: unknown }).digest)
          if (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
            throw e
          }
        }
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return { pending, error, success, run, setError, setSuccess }
}
