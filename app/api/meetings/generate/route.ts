/**
 * Meeting Link Generation Endpoint
 * POST /api/meetings/generate
 * Generates a meeting link (Google Meet or Zoom) for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'
import { MeetingServiceError } from '@/lib/services/types'

interface GenerateMeetingRequest {
  provider: OAuthProvider
  title: string
  description?: string
  startTime: string
  endTime: string
  attendeeEmails: string[]
  timezone?: string
}

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
    const body: GenerateMeetingRequest = await request.json()

    // Validate required fields
    if (
      !body.provider ||
      !body.title ||
      !body.startTime ||
      !body.endTime ||
      !body.attendeeEmails
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate provider
    if (body.provider !== 'google' && body.provider !== 'zoom') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Check if user has active connection
    const hasConnection = await meetingService.hasActiveConnection(
      user.id,
      body.provider
    )

    if (!hasConnection) {
      return NextResponse.json(
        {
          error: 'No active connection',
          message: `Please connect your ${body.provider === 'google' ? 'Google' : 'Zoom'} account first`,
        },
        { status: 403 }
      )
    }

    // Generate meeting link
    const result = await meetingService.generateMeetingLink(user.id, body.provider, {
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      attendees: body.attendeeEmails,
      timezone: body.timezone,
    })

    return NextResponse.json({
      success: true,
      meetingUrl: result.meetingUrl,
      meetingId: result.meetingId,
      provider: result.provider,
      hostUrl: result.hostUrl,
      password: result.password,
    })
  } catch (error) {
    console.error('Meeting generation error:', error)

    if (error instanceof MeetingServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          provider: error.provider,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate meeting link' },
      { status: 500 }
    )
  }
}

/**
 * Check OAuth connection status
 * GET /api/meetings/generate?provider=google
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get userId from query (for dev mode) or from auth
    const queryUserId = request.nextUrl.searchParams.get('userId')
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

    const provider = request.nextUrl.searchParams.get('provider') as OAuthProvider

    if (!provider || (provider !== 'google' && provider !== 'zoom')) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const hasConnection = await meetingService.hasActiveConnection(userId, provider)

    return NextResponse.json({
      provider,
      connected: hasConnection,
    })
  } catch (error) {
    console.error('Connection check error:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
