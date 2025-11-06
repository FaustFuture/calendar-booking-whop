import { createClient } from '@/lib/supabase/server'
import { zoomRecordingService } from './zoomRecordingService'
import { googleRecordingService } from './googleRecordingService'
import type { Booking } from '@/lib/types/database'

/**
 * Service for automatically fetching recordings after meetings complete
 */
export class RecordingFetchService {
  /**
   * Fetch recordings for a completed booking
   */
  async fetchRecordingsForBooking(bookingId: string): Promise<void> {
    const supabase = await createClient()

    // Get booking details with pattern
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        meeting_url,
        admin_id,
        pattern_id
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      console.error('Booking not found:', error)
      return
    }

    // Get pattern details if exists
    let meetingType: string | undefined
    if (booking.pattern_id) {
      const { data: pattern } = await supabase
        .from('availability_patterns')
        .select('meeting_type')
        .eq('id', booking.pattern_id)
        .single()

      meetingType = pattern?.meeting_type
    }

    const meetingUrl = booking.meeting_url

    if (!meetingUrl) {
      console.log('No meeting URL found for booking', bookingId)
      return
    }

    try {
      if (meetingType === 'zoom' && meetingUrl.includes('zoom.us')) {
        await this.fetchZoomRecording(booking, meetingUrl)
      } else if (meetingType === 'google_meet' && meetingUrl.includes('meet.google.com')) {
        await this.fetchGoogleRecording(booking, meetingUrl)
      }
    } catch (error) {
      console.error(`Failed to fetch recording for booking ${bookingId}:`, error)
    }
  }

  /**
   * Fetch Zoom recording
   */
  private async fetchZoomRecording(booking: any, meetingUrl: string): Promise<void> {
    // Extract meeting ID from Zoom URL
    // Example: https://zoom.us/j/1234567890 or https://us05web.zoom.us/j/1234567890
    const meetingIdMatch = meetingUrl.match(/\/j\/(\d+)/)
    if (!meetingIdMatch) {
      console.error('Could not extract Zoom meeting ID from URL:', meetingUrl)
      return
    }

    const meetingId = meetingIdMatch[1]

    // Wait a bit for recording to be processed (optional)
    // Zoom usually processes recordings within a few minutes
    console.log(`Fetching Zoom recording for meeting ${meetingId}...`)

    try {
      const recordings = await zoomRecordingService.fetchAndSaveRecordings(
        booking.id,
        meetingId,
        booking.admin_id
      )

      if (recordings.length > 0) {
        console.log(`Successfully fetched ${recordings.length} Zoom recording(s)`)
      } else {
        console.log('No Zoom recordings found yet (may still be processing)')
      }
    } catch (error: any) {
      // Recording might not be ready yet
      if (error.message?.includes('404')) {
        console.log('Zoom recording not ready yet, will retry later')
      } else {
        throw error
      }
    }
  }

  /**
   * Fetch Google Meet recording
   */
  private async fetchGoogleRecording(booking: any, meetingUrl: string): Promise<void> {
    // Extract meeting code from Google Meet URL
    // Example: https://meet.google.com/abc-defg-hij
    const meetingCode = googleRecordingService.extractMeetingCode(meetingUrl)

    if (!meetingCode) {
      console.error('Could not extract Google Meet code from URL:', meetingUrl)
      return
    }

    console.log(`Fetching Google Meet recording for meeting ${meetingCode}...`)

    try {
      const recordings = await googleRecordingService.fetchAndSaveRecordings(
        booking.id,
        meetingCode,
        booking.admin_id
      )

      if (recordings.length > 0) {
        console.log(`Successfully fetched ${recordings.length} Google Meet recording(s)`)
      } else {
        console.log('No Google Meet recordings found yet')
      }
    } catch (error: any) {
      // Recording might not be available yet or user doesn't have permissions
      console.error('Failed to fetch Google Meet recording:', error.message)
    }
  }

  /**
   * Poll for recordings that might have been missed
   * Run this periodically (e.g., every 30 minutes) via a cron job
   */
  async pollForMissedRecordings(): Promise<void> {
    const supabase = await createClient()

    // Find completed bookings from the last 48 hours without recordings
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        meeting_url,
        admin_id,
        updated_at,
        pattern:pattern_id(meeting_type, meeting_config)
      `)
      .eq('status', 'completed')
      .gte('updated_at', twoDaysAgo)
      .is('meeting_url', 'not.null')

    if (error || !bookings) {
      console.error('Failed to query bookings:', error)
      return
    }

    console.log(`Polling ${bookings.length} completed bookings for recordings...`)

    for (const booking of bookings) {
      // Check if recordings already exist
      const { data: existingRecordings } = await supabase
        .from('recordings')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('auto_fetched', true)

      if (existingRecordings && existingRecordings.length > 0) {
        // Already have recordings
        continue
      }

      // Try to fetch recordings
      await this.fetchRecordingsForBooking(booking.id)

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Polling complete')
  }
}

export const recordingFetchService = new RecordingFetchService()
