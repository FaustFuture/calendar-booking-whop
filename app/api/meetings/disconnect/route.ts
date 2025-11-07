/**
 * Disconnect OAuth Provider Endpoint
 * POST /api/meetings/disconnect
 * Disconnects an OAuth provider for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const provider = body.provider as OAuthProvider
    const { companyId } = body

    // Require companyId for Whop multi-tenancy
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

    const supabase = await createClient()

    if (!provider || (provider !== 'google' && provider !== 'zoom')) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Disconnect provider
    await meetingService.disconnectProvider(whopUser.userId, provider)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    )
  }
}
