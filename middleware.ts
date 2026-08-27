import { type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // આ ફંક્શન દરેક પેજ લોડ થતા પહેલા રન થશે અને સેશન ચેક કરશે
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * નીચેના પાથ સિવાયના બધા જ પેજ પર middleware રન થશે:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, svg, વગેરે...
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}