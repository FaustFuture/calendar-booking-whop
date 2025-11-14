/**
 * Notification Check Cron Job
 * This endpoint should be called periodically (every minute) to check for upcoming meetings
 * and send reminder notifications 24 hours, 2 hours, and 30 minutes before meetings.
 * 
 * Setup in Vercel:
 * 1. Go to your project settings
 * 2. Navigate to "Cron Jobs"
 * 3. Add a new cron job:
 *    - Path: /api/notifications/check
 *    - Schedule: * * * * * (every minute)
 */

import { NextResponse } from 'next/server'

// Force dynamic rendering to prevent caching in cron jobs
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notificationService } from '@/lib/services/notificationService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const userAgent = request.headers.get('user-agent') || ''
    const isCronJob = userAgent.includes('vercel-cron')

    // If called from client (with companyId), verify user authentication
    if (companyId && !isCronJob) {
      try {
        const { requireWhopAuth } = await import('@/lib/auth/whop')
        await requireWhopAuth(companyId, true)
      } catch (authError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // For cron jobs, check CRON_SECRET if set
    if (isCronJob) {
      const authHeader = request.headers.get('authorization')
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Verify WHOP_API_KEY is available
    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'WHOP_API_KEY not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const now = new Date()

    // If companyId provided, filter by company; otherwise check all companies
    let query = supabase
      .from('bookings')
      .select(`
        id,
        title,
        booking_start_time,
        company_id,
        member_id,
        status,
        meeting_url,
        notification_24h_sent,
        notification_2h_sent,
        notification_30min_sent,
        member:member_id(id, name, email),
        pattern:pattern_id(company_id)
      `)
      .eq('status', 'upcoming')
      .not('booking_start_time', 'is', null)
      .or('notification_24h_sent.is.null,notification_24h_sent.eq.false,notification_2h_sent.is.null,notification_2h_sent.eq.false,notification_30min_sent.is.null,notification_30min_sent.eq.false')

    // Filter by company if provided (client-side calls)
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    // Calculate time windows (with ±1 minute buffer to catch meetings in the current minute window)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)

    const twentyFourHourWindowStart = new Date(twentyFourHoursFromNow.getTime() - 60 * 1000)
    const twentyFourHourWindowEnd = new Date(twentyFourHoursFromNow.getTime() + 60 * 1000)
    const twoHourWindowStart = new Date(twoHoursFromNow.getTime() - 60 * 1000)
    const twoHourWindowEnd = new Date(twoHoursFromNow.getTime() + 60 * 1000)
    const thirtyMinWindowStart = new Date(thirtyMinutesFromNow.getTime() - 60 * 1000)
    const thirtyMinWindowEnd = new Date(thirtyMinutesFromNow.getTime() + 60 * 1000)

    // Fetch upcoming bookings (already filtered above)
    const { data: upcomingBookings, error: fetchError } = await query
      .order('booking_start_time', { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({
        message: 'No upcoming bookings found',
        checked: 0,
        sent: { '24h': 0, '2h': 0, '30min': 0 },
      })
    }

    let sent24h = 0
    let sent2h = 0
    let sent30min = 0

    // Process each booking
    for (const booking of upcomingBookings) {
      if (!booking.booking_start_time) continue

      const startTime = new Date(booking.booking_start_time)
      const bookingStartTime = startTime.getTime()

      // Check if booking is in 24-hour window
      const isIn24hWindow =
        bookingStartTime >= twentyFourHourWindowStart.getTime() &&
        bookingStartTime <= twentyFourHourWindowEnd.getTime()

      // Check if booking is in 2-hour window
      const isIn2hWindow =
        bookingStartTime >= twoHourWindowStart.getTime() &&
        bookingStartTime <= twoHourWindowEnd.getTime()

      // Check if booking is in 30-minute window
      const isIn30minWindow =
        bookingStartTime >= thirtyMinWindowStart.getTime() &&
        bookingStartTime <= thirtyMinWindowEnd.getTime()

      // Send 24-hour notification
      if (isIn24hWindow && !booking.notification_24h_sent) {
        try {
          const meetingTime = new Date(booking.booking_start_time)
          const timeString = meetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          const dateString = meetingTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

          // Send to member if exists
          if (booking.member_id) {
            await notificationService.sendNotificationToUser(
              booking.member_id,
              booking.company_id,
              `Meeting Reminder: ${booking.title}`,
              `Your meeting is scheduled for ${dateString} at ${timeString}`,
              `/bookings/${booking.id}`,
              false
            )
          }

          // Send to admins in the company
          await notificationService.sendNotificationToAdmins(
            booking.company_id,
            `Meeting Reminder: ${booking.title}`,
            `A meeting is scheduled for ${dateString} at ${timeString}`,
            `/bookings/${booking.id}`,
            false
          )

          await notificationService.markNotificationSent(booking.id, '24h')
          sent24h++
        } catch (error) {
          // Failed to send 24-hour reminder
        }
      }

      // Send 2-hour notification
      if (isIn2hWindow && !booking.notification_2h_sent) {
        try {
          const timeString = new Date(booking.booking_start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

          // Send to member if exists
          if (booking.member_id) {
            await notificationService.sendNotificationToUser(
              booking.member_id,
              booking.company_id,
              `Meeting Reminder: ${booking.title}`,
              `Your meeting starts in 2 hours at ${timeString}`,
              `/bookings/${booking.id}`,
              false
            )
          }

          // Send to admins in the company
          await notificationService.sendNotificationToAdmins(
            booking.company_id,
            `Meeting Reminder: ${booking.title}`,
            `A meeting starts in 2 hours at ${timeString}`,
            `/bookings/${booking.id}`,
            false
          )

          await notificationService.markNotificationSent(booking.id, '2h')
          sent2h++
        } catch (error) {
          // Failed to send 2-hour reminder
        }
      }

      // Send 30-minute notification
      if (isIn30minWindow && !booking.notification_30min_sent) {
        try {
          // Send to member if exists
          if (booking.member_id) {
            await notificationService.sendNotificationToUser(
              booking.member_id,
              booking.company_id,
              `Meeting Starting Soon: ${booking.title}`,
              `Your meeting starts in 30 minutes!`,
              `/bookings/${booking.id}`,
              false
            )
          }

          // Send to admins in the company
          await notificationService.sendNotificationToAdmins(
            booking.company_id,
            `Meeting Starting Soon: ${booking.title}`,
            `A meeting starts in 30 minutes!`,
            `/bookings/${booking.id}`,
            false
          )

          await notificationService.markNotificationSent(booking.id, '30min')
          sent30min++
        } catch (error) {
          // Failed to send 30-minute reminder
        }
      }
    }

    return NextResponse.json({
      message: 'Notification check completed',
      checked: upcomingBookings.length,
      sent: {
        '24h': sent24h,
        '2h': sent2h,
        '30min': sent30min,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

