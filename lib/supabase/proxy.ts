import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Route prefixes that require an authenticated user. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/timesheet',
  '/entries',
  '/attendance',
  '/monthly',
  '/activity',
  '/projects',
  '/team',
  '/reports',
  '/settings',
  '/onboarding',
  '/admin',
]

/** Auth pages a logged-in user should be bounced away from. */
const AUTH_ROUTES = ['/login', '/register']

/**
 * Runs on every request: refreshes the Supabase session cookie and performs
 * coarse auth redirects. Fine-grained org/role checks happen in layouts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Soft account deactivation: block disabled users on every gated route.
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('deactivated_at')
      .eq('id', user.id)
      .maybeSingle<{ deactivated_at: string | null }>()

    if (profile?.deactivated_at && pathname !== '/deactivated') {
      const url = request.nextUrl.clone()
      url.pathname = '/deactivated'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
