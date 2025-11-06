/**
 * Disconnect OAuth Provider Endpoint
 * POST /api/meetings/disconnect
 * Disconnects an OAuth provider for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user (or use dev mode)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Dev mode fallback
    const DEV_MODE_USER_ID = '00000000-0000-0000-0000-000000000001'
    const userId = user?.id || DEV_MODE_USER_ID

    // Parse request body
    const body = await request.json()
    const provider = body.provider as OAuthProvider

    if (!provider || (provider !== 'google' && provider !== 'zoom')) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Disconnect provider
    await meetingService.disconnectProvider(userId, provider)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    )
  }
}
