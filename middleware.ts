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

  // Create a new headers object to potentially modify
  const requestHeaders = new Headers(request.headers)

  // Forward Whop iframe headers if present (critical for production)
  const whopCompanyId = request.headers.get('x-whop-company-id')
  const whopUserId = request.headers.get('x-whop-user-id')

  if (whopCompanyId) {
    requestHeaders.set('x-whop-company-id', whopCompanyId)
    console.log('[Middleware] Forwarding Whop company ID:', whopCompanyId)
  }

  if (whopUserId) {
    requestHeaders.set('x-whop-user-id', whopUserId)
  }

  // Extract companyId from URL for dashboard routes
  const companyIdMatch = pathname.match(/^\/dashboard\/([^\/]+)/)
  const companyId = companyIdMatch ? companyIdMatch[1] : null

  // For dashboard routes, ensure companyId exists and is valid
  if (pathname.startsWith('/dashboard/') && companyId) {
    // The actual authentication will be handled by the page/API route
    // Middleware just validates the URL structure

    // Check if this is a valid company ID format (basic validation)
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      console.error('[Middleware] Invalid companyId in URL:', companyId)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Add extracted companyId to headers for downstream use
    requestHeaders.set('x-company-id', companyId)
  }

  // For API routes, ensure companyId is in headers
  if (pathname.startsWith('/api/')) {
    // Prefer URL-extracted companyId, fallback to Whop header
    const effectiveCompanyId = companyId || whopCompanyId

    if (effectiveCompanyId) {
      requestHeaders.set('x-company-id', effectiveCompanyId)
    }
  }

  // Return with potentially modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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
