/**
 * Zoom OAuth Initiation Endpoint
 * GET /api/meetings/oauth/zoom
 * Initiates the Zoom OAuth flow for Whop authenticated users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWhopUserFromHeaders } from '@/lib/auth'
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

    // Get authenticated Whop user
    const whopUser = await getWhopUserFromHeaders()
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state parameter for CSRF protection
    // Include companyId in state to validate on callback
    const state = `${whopUser.userId}:${companyId}:${Date.now()}:${Math.random().toString(36).substring(7)}`

    // Get authorization URL
    const authUrl = zoomService.getAuthorizationUrl(state)

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
