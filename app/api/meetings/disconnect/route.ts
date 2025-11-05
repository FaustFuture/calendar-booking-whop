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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const provider = body.provider as OAuthProvider

    if (!provider || (provider !== 'google' && provider !== 'zoom')) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Disconnect provider
    await meetingService.disconnectProvider(user.id, provider)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    )
  }
}
