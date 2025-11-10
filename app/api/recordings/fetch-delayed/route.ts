/**
 * Delayed Recording Fetch Cron Job
 * This endpoint should be called periodically (every minute) to fetch recordings
 * for meetings that ended 15 minutes ago (Phase 3: 15-minute delayed fetch)
 * 
 * Setup in Vercel:
 * Add to vercel.json crons array with schedule: "* * * * *" (every minute)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordingFetchService } from '@/lib/services/recordingFetchService'

// Force dynamic rendering to prevent caching in cron jobs
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Optional: Add authentication/authorization check for cron job
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()

    // Calculate 15 minutes ago with a 1-minute buffer window
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    const windowStart = new Date(fifteenMinutesAgo.getTime() - 60 * 1000) // 1 minute before
    const windowEnd = new Date(fifteenMinutesAgo.getTime() + 60 * 1000) // 1 minute after

    console.log('🎥 Checking for meetings that ended 15 minutes ago...', {
      now: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    })

    // Find completed bookings that:
    // 1. Ended approximately 15 minutes ago (within 2-minute window)
    // 2. Haven't had their 15-minute fetch yet
    // 3. Have a meeting URL (required for recording fetch)
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        company_id,
        booking_end_time,
        slot:slot_id(end_time),
        meeting_url
      `)
      .eq('status', 'completed')
      .or('recording_fetch_15min.is.null,recording_fetch_15min.eq.false')
      .not('meeting_url', 'is', null)

    if (fetchError) {
      console.error('❌ Error fetching bookings:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        message: 'No bookings found for 15-minute delayed fetch',
        checked: 0,
        fetched: 0,
      })
    }

    // Filter bookings that ended approximately 15 minutes ago
    const bookingsToFetch = bookings.filter(booking => {
      const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
      const endTime = (slot as any)?.end_time || booking.booking_end_time
      
      if (!endTime) return false

      const endTimeDate = new Date(endTime)
      return (
        endTimeDate >= windowStart &&
        endTimeDate <= windowEnd
      )
    })

    if (bookingsToFetch.length === 0) {
      return NextResponse.json({
        message: 'No bookings found for 15-minute delayed fetch',
        checked: bookings.length,
        fetched: 0,
      })
    }

    console.log(`📹 Found ${bookingsToFetch.length} booking(s) to fetch recordings for`)

    let fetched = 0
    let failed = 0

    // Fetch recordings for each booking
    for (const booking of bookingsToFetch) {
      try {
        // Mark that we're attempting the 15-minute fetch
        await supabase
          .from('bookings')
          .update({ recording_fetch_15min: true })
          .eq('id', booking.id)

        // Fetch recordings
        await recordingFetchService.fetchRecordingsForBooking(
          booking.id,
          booking.company_id
        )

        fetched++
        console.log(`✅ Fetched recordings for booking ${booking.id} (15-minute delayed)`)
      } catch (error) {
        failed++
        console.error(`❌ Failed to fetch recordings for booking ${booking.id} (15-minute delayed):`, error)
        // Continue with other bookings even if one fails
      }
    }

    return NextResponse.json({
      message: '15-minute delayed recording fetch completed',
      checked: bookings.length,
      fetched,
      failed,
    })
  } catch (error) {
    console.error('❌ Error in 15-minute delayed recording fetch:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

