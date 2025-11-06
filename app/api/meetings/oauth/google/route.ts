/**
 * Google OAuth Initiation Endpoint
 * GET /api/meetings/oauth/google
 * Initiates the Google OAuth flow for Whop authenticated users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWhopUserFromHeaders } from '@/lib/auth'
import { googleMeetService } from '@/lib/services/googleMeetService'

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

    // Get authenticated Whop user
    const whopUser = await getWhopUserFromHeaders()
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state parameter for CSRF protection
    // Include companyId in state to validate on callback
    const state = `${whopUser.userId}:${companyId}:${Date.now()}:${Math.random().toString(36).substring(7)}`

    // Get authorization URL
    const authUrl = googleMeetService.getAuthorizationUrl(state)

    return NextResponse.json({
      authUrl,
      state,
    })
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}
