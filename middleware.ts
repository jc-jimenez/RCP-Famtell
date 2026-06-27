import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { detectUserRole, getRoleRedirect } from '@/lib/utils/role-detection'

// Rutas públicas que no requieren auth
const PUBLIC_PATHS = ['/login', '/registro', '/activar', '/recuperar', '/api/auth', '/api/invitations', '/api/registro', '/portal']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dejar pasar rutas públicas y assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Sin sesión → login
  if (!session) {
      const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const context = await detectUserRole(
    supabase,
    session.user.id,
    session.user.email!,
  )

  // Usuario autenticado pero sin rol → login
  if (!context) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Evitar bucles de redirección: si ya está en la ruta correcta, dejar pasar
  const correctBase = getRoleRedirect(context.role, context.caseId)

  // Proteger rutas de rol cruzado
  const roleGuards: Record<string, string[]> = {
    '/admin':      ['super_admin'],
    '/dashboard':  ['consultant'],
    '/caso':       ['director', 'consultant', 'super_admin'],
    '/mis-modulos':['collaborator'],
    '/activar':    ['director', 'collaborator', 'consultant', 'super_admin'], // permitir siempre
  }

  for (const [prefix, allowedRoles] of Object.entries(roleGuards)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(context.role)) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = correctBase
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Ruta raíz → redirigir a la pantalla correcta según el rol
  if (pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = correctBase
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
