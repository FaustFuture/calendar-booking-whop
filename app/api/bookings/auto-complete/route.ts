/**
 * Auto-Complete Bookings Cron Job
 * This endpoint should be called periodically to:
 * 1. Mark past bookings as completed
 * 2. Fetch recordings for newly completed bookings (Phase 2: auto-complete)
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
    const now = new Date().toISOString()

    // Find all upcoming bookings where the end time has passed
    const { data: pastBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        company_id,
        slot:slot_id(end_time),
        booking_end_time
      `)
      .eq('status', 'upcoming')

    if (fetchError) {
      console.error('❌ Error fetching bookings:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pastBookings || pastBookings.length === 0) {
      return NextResponse.json({
        message: 'No past bookings to complete',
        updated: 0,
        recordingsFetched: 0,
      })
    }

    // Filter bookings where end time has passed
    const bookingsToUpdate = pastBookings.filter(booking => {
      const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
      const endTime = (slot as any)?.end_time || booking.booking_end_time
      if (!endTime) return false
      return new Date(endTime) < new Date(now)
    })

    if (bookingsToUpdate.length === 0) {
      return NextResponse.json({
        message: 'No past bookings to complete',
        updated: 0,
        recordingsFetched: 0,
      })
    }

    // Update all past bookings to 'completed' status
    const bookingIds = bookingsToUpdate.map(b => b.id)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'completed',
        recording_fetch_auto_complete: true, // Mark that we're attempting fetch
      })
      .in('id', bookingIds)

    if (updateError) {
      console.error('❌ Error updating past bookings:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`✅ Updated ${bookingIds.length} past bookings to completed status`)

    // Phase 2: Fetch recordings for newly auto-completed bookings
    let recordingsFetched = 0
    for (const booking of bookingsToUpdate) {
      try {
        await recordingFetchService.fetchRecordingsForBooking(
          booking.id,
          booking.company_id
        )
        recordingsFetched++
        console.log(`✅ Fetched recordings for auto-completed booking ${booking.id}`)
      } catch (error) {
        console.error(`❌ Failed to fetch recordings for booking ${booking.id} (auto-complete):`, error)
        // Continue with other bookings even if one fails
      }
    }

    return NextResponse.json({
      message: 'Auto-complete check completed',
      updated: bookingIds.length,
      recordingsFetched,
    })
  } catch (error) {
    console.error('❌ Error in auto-complete check:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

