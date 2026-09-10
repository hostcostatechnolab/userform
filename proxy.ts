import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Renamed from `middleware.ts` — Next.js 16 calls this convention "proxy".
// Runs before every matched request to keep the Supabase session fresh.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - image assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
