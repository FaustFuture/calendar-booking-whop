/**
 * Google OAuth Initiation Endpoint
 * GET /api/meetings/oauth/google
 * Initiates the Google OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleMeetService } from '@/lib/services/googleMeetService'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get userId from query params (for dev mode) or from auth
    const { searchParams } = new URL(request.url)
    const queryUserId = searchParams.get('userId')

    let userId = queryUserId

    if (!userId) {
      // Try to get from authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Fall back to dev mode ID
        userId = '00000000-0000-0000-0000-000000000001'
      } else {
        userId = user.id
      }
    }

    // Generate state parameter for CSRF protection
    const state = `${userId}:${Date.now()}:${Math.random().toString(36).substring(7)}`

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
