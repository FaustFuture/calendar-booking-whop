/**
 * Notification Check Cron Job
 * This endpoint should be called periodically (every minute) to check for upcoming meetings
 * and send reminder notifications 15 minutes and 2 minutes before meetings.
 * 
 * Setup in Vercel:
 * 1. Go to your project settings
 * 2. Navigate to "Cron Jobs"
 * 3. Add a new cron job:
 *    - Path: /api/notifications/check
 *    - Schedule: * * * * * (every minute)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notificationService } from '@/lib/services/notificationService'

export async function GET(request: Request) {
  try {
    // Optional: Add authentication/authorization check for cron job
    // For Vercel Cron, you can use a secret header
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()

    // Calculate time windows
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000)

    // Add 1 minute buffer to catch meetings in the current minute window
    const fifteenMinWindowStart = new Date(fifteenMinutesFromNow.getTime() - 60 * 1000)
    const fifteenMinWindowEnd = new Date(fifteenMinutesFromNow.getTime() + 60 * 1000)
    const twoMinWindowStart = new Date(twoMinutesFromNow.getTime() - 60 * 1000)
    const twoMinWindowEnd = new Date(twoMinutesFromNow.getTime() + 60 * 1000)

    console.log('🔔 Checking for upcoming meetings...', {
      now: now.toISOString(),
      fifteenMinWindow: {
        start: fifteenMinWindowStart.toISOString(),
        end: fifteenMinWindowEnd.toISOString(),
      },
      twoMinWindow: {
        start: twoMinWindowStart.toISOString(),
        end: twoMinWindowEnd.toISOString(),
      },
    })

    // Fetch all upcoming bookings
    // Only get bookings that haven't sent all notifications yet
    const { data: upcomingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        title,
        booking_start_time,
        company_id,
        member_id,
        status,
        meeting_url,
        notification_15min_sent,
        notification_2min_sent,
        member:member_id(id, name, email),
        pattern:pattern_id(company_id)
      `)
      .eq('status', 'upcoming')
      .not('booking_start_time', 'is', null)
      .or('notification_15min_sent.is.null,notification_15min_sent.eq.false,notification_2min_sent.is.null,notification_2min_sent.eq.false')
      .order('booking_start_time', { ascending: true })

    if (fetchError) {
      console.error('❌ Error fetching bookings:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({
        message: 'No upcoming bookings found',
        checked: 0,
        sent: { '15min': 0, '2min': 0 },
      })
    }

    let sent15Min = 0
    let sent2Min = 0

    // Process each booking
    for (const booking of upcomingBookings) {
      if (!booking.booking_start_time) continue

      const startTime = new Date(booking.booking_start_time)
      const bookingStartTime = startTime.getTime()

      // Check if booking is in 15-minute window
      const isIn15MinWindow =
        bookingStartTime >= fifteenMinWindowStart.getTime() &&
        bookingStartTime <= fifteenMinWindowEnd.getTime()

      // Check if booking is in 2-minute window
      const isIn2MinWindow =
        bookingStartTime >= twoMinWindowStart.getTime() &&
        bookingStartTime <= twoMinWindowEnd.getTime()

      // We'll send notifications to all admins in the company via companyTeamId
      // The notification service's sendNotificationToAdmins handles this

      // Send 15-minute notification
      if (isIn15MinWindow && !booking.notification_15min_sent) {
        try {
          // Send to member if exists
          if (booking.member_id) {
            await notificationService.sendNotificationToUser(
              booking.member_id,
              booking.company_id,
              `Meeting Reminder: ${booking.title}`,
              `Your meeting starts in 15 minutes at ${new Date(booking.booking_start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
              `/bookings/${booking.id}`,
              true // isMention for immediate push
            )
          }

          // Send to admins in the company
          await notificationService.sendNotificationToAdmins(
            booking.company_id,
            `Meeting Reminder: ${booking.title}`,
            `A meeting starts in 15 minutes at ${new Date(booking.booking_start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
            `/bookings/${booking.id}`,
            true // isMention for immediate push
          )

          await notificationService.markNotificationSent(booking.id, '15min')
          sent15Min++
          console.log(`✅ Sent 15-minute reminder for booking ${booking.id}`)
        } catch (error) {
          console.error(`❌ Failed to send 15-minute reminder for booking ${booking.id}:`, error)
        }
      }

      // Send 2-minute notification
      if (isIn2MinWindow && !booking.notification_2min_sent) {
        try {
          // Send to member if exists
          if (booking.member_id) {
            await notificationService.sendNotificationToUser(
              booking.member_id,
              booking.company_id,
              `Meeting Starting Soon: ${booking.title}`,
              `Your meeting starts in 2 minutes!`,
              `/bookings/${booking.id}`,
              true // isMention for immediate push
            )
          }

          // Send to admins in the company
          await notificationService.sendNotificationToAdmins(
            booking.company_id,
            `Meeting Starting Soon: ${booking.title}`,
            `A meeting starts in 2 minutes!`,
            `/bookings/${booking.id}`,
            true // isMention for immediate push
          )

          await notificationService.markNotificationSent(booking.id, '2min')
          sent2Min++
          console.log(`✅ Sent 2-minute reminder for booking ${booking.id}`)
        } catch (error) {
          console.error(`❌ Failed to send 2-minute reminder for booking ${booking.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: 'Notification check completed',
      checked: upcomingBookings.length,
      sent: {
        '15min': sent15Min,
        '2min': sent2Min,
      },
    })
  } catch (error) {
    console.error('❌ Error in notification check:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

