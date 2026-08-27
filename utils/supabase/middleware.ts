import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // યુઝર લોગીન છે કે નહિ તે ચેક કરો
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route Protection: જો યુઝર લોગીન ના હોય અને /profile પેજ ખોલવાનો પ્રયાસ કરે, તો તેને /login પર મોકલો
  if (!user && request.nextUrl.pathname.startsWith('/profile')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // જો યુઝર લોગીન હોય અને /login કે /register પેજ પર જવાનો પ્રયાસ કરે, તો તેને /profile પર મોકલો
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}