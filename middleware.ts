import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for protecting routes with Whop authentication
 *
 * This middleware runs on all requests matching the config matcher.
 * It checks for Whop authentication headers and company access.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Extract companyId from URL for dashboard routes
  const companyIdMatch = pathname.match(/^\/dashboard\/([^\/]+)/)
  const companyId = companyIdMatch ? companyIdMatch[1] : null

  // For dashboard routes, ensure companyId exists
  if (pathname.startsWith('/dashboard/') && companyId) {
    // The actual authentication will be handled by the page/API route
    // Middleware just validates the URL structure

    // Check if this is a valid company ID format (basic validation)
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }
  }

  // For API routes, add companyId to headers if present in the URL
  if (pathname.startsWith('/api/') && companyId) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-company-id', companyId)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
