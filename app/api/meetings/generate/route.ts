/**
 * Meeting Link Generation Endpoint
 * POST /api/meetings/generate
 * Generates a meeting link (Zoom) for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'
import { MeetingServiceError } from '@/lib/services/types'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

interface GenerateMeetingRequest {
  provider: OAuthProvider
  title: string
  description?: string
  startTime: string
  endTime: string
  attendeeEmails: string[]
  timezone?: string
  companyId: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: GenerateMeetingRequest = await request.json()

    // Require companyId for Whop multi-tenancy
    if (!body.companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify Whop authentication and company access
    const whopUser = await requireWhopAuth(body.companyId, true)

    // Sync user to Supabase
    // await syncWhopUserToSupabase(whopUser)

    const supabase = await createClient()

    // Validate required fields
    if (
      !body.provider ||
      !body.title ||
      !body.startTime ||
      !body.endTime ||
      !Array.isArray(body.attendeeEmails)
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate provider
    if (body.provider !== 'zoom' && body.provider !== 'google') {
      return NextResponse.json({ error: 'Invalid provider. Only Zoom and Google Meet are supported.' }, { status: 400 })
    }

    // Zoom uses Server-to-Server OAuth - no user connection check needed
    // Google Meet uses user OAuth connections - check if connected

    // Generate meeting link
    const result = await meetingService.generateMeetingLink(whopUser.userId, body.provider, {
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
 * GET /api/meetings/generate?provider=google&companyId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId')

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
    const provider = request.nextUrl.searchParams.get('provider') as OAuthProvider

    if (!provider || (provider !== 'zoom' && provider !== 'google')) {
      return NextResponse.json({ error: 'Invalid provider. Only Zoom and Google Meet are supported.' }, { status: 400 })
    }

    const hasConnection = await meetingService.hasActiveConnection(whopUser.userId, provider)

    return NextResponse.json({
      provider,
      connected: hasConnection,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
