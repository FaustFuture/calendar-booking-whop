/**
 * Manual Recording Fetch API
 * POST /api/recordings/fetch
 * Manually trigger recording fetch for a completed booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordingFetchService } from '@/lib/services/recordingFetchService'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only admins can manually fetch recordings
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch recordings
    await recordingFetchService.fetchRecordingsForBooking(bookingId)

    // Get the recordings that were just fetched
    const { data: recordings } = await supabase
      .from('recordings')
      .select('*')
      .eq('booking_id', bookingId)

    return NextResponse.json({
      success: true,
      message: 'Recording fetch initiated',
      recordings,
    })
  } catch (error: any) {
    console.error('Recording fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recordings' },
      { status: 500 }
    )
  }
}

/**
 * Poll for missed recordings (can be called by a cron job)
 * GET /api/recordings/fetch?action=poll
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const cronSecret = searchParams.get('secret')

    // Verify cron secret to prevent unauthorized polling
    const expectedSecret = process.env.CRON_SECRET
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (action === 'poll') {
      await recordingFetchService.pollForMissedRecordings()
      return NextResponse.json({ success: true, message: 'Polling complete' })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use action=poll' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Recording poll error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to poll recordings' },
      { status: 500 }
    )
  }
}
