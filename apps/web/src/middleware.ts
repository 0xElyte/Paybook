import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)
  const isInviteRoute = pathname.startsWith('/invite/')
  const isApiAuthRoute = pathname.startsWith('/api/auth')

  if (isApiAuthRoute || isInviteRoute) return NextResponse.next()

  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/owner/collections', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
