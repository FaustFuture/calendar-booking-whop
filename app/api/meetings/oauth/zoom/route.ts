/**
 * Zoom OAuth Initiation Endpoint
 * GET /api/meetings/oauth/zoom
 * Initiates the Zoom OAuth flow for Whop authenticated users
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'
import { zoomService } from '@/lib/services/zoomService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Require companyId for multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify Whop authentication and company access
    const whopUser = await requireWhopAuth(companyId, true)

    // Sync user to Supabase
    await syncWhopUserToSupabase(whopUser)

    // Generate state parameter for CSRF protection
    // Include companyId in state to validate on callback
    const state = `${whopUser.userId}:${companyId}:${Date.now()}:${Math.random().toString(36).substring(7)}`

    // Get authorization URL
    const authUrl = zoomService.getAuthorizationUrl(state)

    // Log for debugging (remove sensitive data in production)
    console.log('Zoom OAuth URL generated:', {
      hasClientId: !!process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID,
      redirectUri: process.env.ZOOM_REDIRECT_URI,
      urlLength: authUrl.length,
      // Don't log full URL with state in production
    })

    return NextResponse.json({
      authUrl,
      state,
    })
  } catch (error) {
    console.error('Zoom OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Zoom OAuth' },
      { status: 500 }
    )
  }
}
