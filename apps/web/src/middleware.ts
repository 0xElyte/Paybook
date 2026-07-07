import NextAuth, { type Session } from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import { authConfig } from '@/lib/auth.config'

// Instantiated from the edge-safe config, NOT lib/auth.ts — importing the full
// config would pull Prisma + bcryptjs into the Edge bundle and blow the 1 MB
// middleware size limit. JWT session checks only need the cookie + AUTH_SECRET.
// Explicit portable type for the same TS2742 reason documented in lib/auth.ts.
type AugmentedRequest = NextRequest & { auth: Session | null }
type AuthMiddlewareFn = (req: AugmentedRequest, ctx?: unknown) =>
  NextResponse | Response | void | Promise<NextResponse | Response | void>

const auth: (callback: AuthMiddlewareFn) => (req: NextRequest, ctx?: unknown) => Promise<Response> =
  NextAuth(authConfig).auth as never

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // '/' is public: signed-out visitors get the marketing landing page there
  // (the page itself decides landing vs dashboard based on session).
  const publicRoutes = ['/', '/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)
  const isInviteRoute = pathname.startsWith('/invite/')
  const isApiAuthRoute = pathname.startsWith('/api/auth')
  // These must work regardless of auth state: reset-password/verify-email are
  // routinely hit while already logged in (verify-email especially, since
  // registration auto-signs-in before the link is ever clicked), and
  // forgot-password needs to stay reachable without bouncing through login.
  const isAuthFlowRoute = ['/forgot-password', '/reset-password', '/verify-email'].includes(pathname)

  if (isApiAuthRoute || isInviteRoute || isAuthFlowRoute) return NextResponse.next()

  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
