/**
 * Zoom Webhook Handler
 * POST /api/webhooks/zoom
 * Handles Zoom webhook events for recording completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { zoomRecordingService } from '@/lib/services/zoomRecordingService'
import crypto from 'crypto'

interface ZoomWebhookEvent {
  event: string
  payload: {
    account_id: string
    object: {
      uuid: string
      id: string | number
      host_id: string
      topic: string
      type: number
      start_time: string
      duration: number
      timezone: string
      recording_files: Array<{
        id: string
        recording_start: string
        recording_end: string
        file_type: string
        file_size: number
        play_url: string
        download_url: string
        status: string
        recording_type: string
      }>
    }
  }
  event_ts: number
}

/**
 * Verify Zoom webhook signature
 * https://developers.zoom.us/docs/api/rest/webhook-reference/#verify-webhook-events
 */
function verifyZoomWebhook(
  request: NextRequest,
  body: string
): boolean {
  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn('ZOOM_WEBHOOK_SECRET not configured - skipping verification')
    return true // Allow in dev mode
  }

  const signature = request.headers.get('x-zm-signature')
  const timestamp = request.headers.get('x-zm-request-timestamp')

  if (!signature || !timestamp) {
    return false
  }

  // Construct the message string
  const message = `v0:${timestamp}:${body}`

  // Calculate HMAC
  const hmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(message)
    .digest('hex')

  const expectedSignature = `v0=${hmac}`

  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text()

    // Verify webhook signature
    if (!verifyZoomWebhook(request, body)) {
      console.error('Invalid Zoom webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event: ZoomWebhookEvent = JSON.parse(body)

    console.log('Zoom webhook received:', event.event)

    // Handle different event types
    switch (event.event) {
      case 'recording.completed':
        await handleRecordingCompleted(event)
        break

      case 'endpoint.url_validation':
        // Zoom sends this to validate the webhook endpoint
        // We need to respond with the plainToken in the payload
        const plainToken = (event.payload as unknown as { plainToken: string }).plainToken
        return NextResponse.json({
          plainToken,
          encryptedToken: crypto
            .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET || '')
            .update(plainToken)
            .digest('hex'),
        })

      default:
        console.log(`Unhandled Zoom webhook event: ${event.event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zoom webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle recording.completed event
 * Find the booking associated with this meeting and save the recording
 */
async function handleRecordingCompleted(event: ZoomWebhookEvent) {
  const supabase = await createClient()
  const meetingId = event.payload.object.id.toString()

  console.log(`Processing recording for Zoom meeting: ${meetingId}`)

  // Find booking(s) with this meeting ID
  // The meeting_url might contain the meeting ID
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('id, admin_id, meeting_url')
    .eq('status', 'upcoming')
    .or(`meeting_url.ilike.%${meetingId}%`)

  let bookings = upcomingBookings || []

  if (bookings.length === 0) {
    // Try to find completed bookings (meeting might have just ended)
    const { data: completedBookings } = await supabase
      .from('bookings')
      .select('id, admin_id, meeting_url')
      .eq('status', 'completed')
      .or(`meeting_url.ilike.%${meetingId}%`)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!completedBookings || completedBookings.length === 0) {
      console.warn(`No booking found for Zoom meeting ${meetingId}`)
      return
    }

    bookings = completedBookings
  }

  // Process recording for each matching booking (usually just one)
  for (const booking of bookings) {
    try {
      // Save recording using the service
      const zoomData = {
        id: meetingId,
        uuid: event.payload.object.uuid,
        host_id: event.payload.object.host_id,
        topic: event.payload.object.topic,
        start_time: event.payload.object.start_time,
        duration: event.payload.object.duration,
        total_size: event.payload.object.recording_files.reduce(
          (sum, file) => sum + file.file_size,
          0
        ),
        recording_count: event.payload.object.recording_files.length,
        recording_files: event.payload.object.recording_files.map(file => ({
          ...file,
          meeting_id: meetingId,
        })),
      }

      const recordings = await zoomRecordingService.saveRecordingToDatabase(
        zoomData,
        booking.id
      )

      console.log(
        `Saved ${recordings.length} recording(s) for booking ${booking.id}`
      )

      // Update booking status to completed if still upcoming
      if (bookings[0].id === booking.id) {
        await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .eq('id', booking.id)
          .eq('status', 'upcoming')
      }
    } catch (error) {
      console.error(`Failed to process recording for booking ${booking.id}:`, error)
    }
  }
}
