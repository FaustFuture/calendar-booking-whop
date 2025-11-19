import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/bookings/:id - Get single booking
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        member:member_id(id, name, email),
        slot:slot_id(start_time, end_time)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/bookings/:id - Update booking
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || body.companyId

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify Whop authentication and company access
    const { requireWhopAuth } = await import('@/lib/auth/whop')
    const whopUser = await requireWhopAuth(companyId, true)

    // Get the booking to check ownership and company
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('member_id, company_id, status, calendar_event_id, booking_start_time, booking_end_time, title, guest_name, guest_email')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify company_id matches
    if (booking.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Booking does not belong to this company' },
        { status: 403 }
      )
    }

    // Check permissions: admins can update any booking, members can only update their own
    if (whopUser.role === 'member' && booking.member_id !== whopUser.userId) {
      return NextResponse.json(
        { error: 'You can only update your own bookings' },
        { status: 403 }
      )
    }

    // Extract companyId from body (used for auth only, not a DB column)
    const { companyId: _, ...updateData } = body

    // Check if status is being changed to 'completed' or 'cancelled'
    const isCompleting = updateData.status === 'completed' && booking.status !== 'completed'
    const isCancelling = updateData.status === 'cancelled' && booking.status !== 'cancelled'

    // Check if meeting time is being rescheduled
    const isRescheduling =
      (updateData.booking_start_time && updateData.booking_start_time !== booking.booking_start_time) ||
      (updateData.booking_end_time && updateData.booking_end_time !== booking.booking_end_time)

    // Delete Google Calendar event if booking is being cancelled
    if (isCancelling && booking.calendar_event_id) {
      try {
        console.log('🗑️ Booking cancelled - deleting Google Calendar event...')
        const { meetingService } = await import('@/lib/services/meetingService')

        // First, get an active Google OAuth connection
        const { data: oauthConnection } = await supabase
          .from('oauth_connections')
          .select('user_id')
          .eq('provider', 'google')
          .eq('is_active', true)
          .limit(1)
          .single()

        // Find an admin user who has an active Google OAuth connection
        let adminUserId: string | null = null

        if (oauthConnection?.user_id) {
          // Verify this user is an admin
          const { data: adminUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', oauthConnection.user_id)
            .eq('role', 'admin')
            .single()

          if (adminUser) {
            adminUserId = adminUser.id
          }
        }

        if (adminUserId) {
          await meetingService.deleteGoogleCalendarEvent(
            adminUserId,
            booking.calendar_event_id
          )
          console.log('✅ Google Calendar event deleted')
        } else {
          console.warn('⚠️ No admin with active Google OAuth connection found - skipping calendar deletion')
        }
      } catch (error) {
        console.error('❌ Failed to delete Google Calendar event:', error)
        // Don't fail the booking cancellation if calendar deletion fails
      }
    }

    // Update Google Calendar event if meeting is being rescheduled
    if (isRescheduling && booking.calendar_event_id && whopUser.role === 'admin') {
      try {
        console.log('📅 Meeting rescheduled - updating Google Calendar event...')
        const { meetingService } = await import('@/lib/services/meetingService')

        // First, get all active Google OAuth connections
        const { data: oauthConnections } = await supabase
          .from('oauth_connections')
          .select('user_id')
          .eq('provider', 'google')
          .eq('is_active', true)
          .limit(1)
          .single()

        // Find an admin user who has an active Google OAuth connection
        let adminUserId: string | null = null

        if (oauthConnections?.user_id) {
          // Verify this user is an admin
          const { data: adminUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', oauthConnections.user_id)
            .eq('role', 'admin')
            .single()

          if (adminUser) {
            adminUserId = adminUser.id
          }
        }

        if (adminUserId) {
          const calendarUpdates: any = {}

          if (updateData.booking_start_time) {
            calendarUpdates.startTime = updateData.booking_start_time
          }

          if (updateData.booking_end_time) {
            calendarUpdates.endTime = updateData.booking_end_time
          }

          if (updateData.title) {
            calendarUpdates.title = updateData.title
          }

          // Add timezone if provided by client
          if (body.timezone) {
            calendarUpdates.timezone = body.timezone
          }

          await meetingService.updateGoogleCalendarEvent(
            adminUserId,
            booking.calendar_event_id,
            calendarUpdates
          )
          console.log('✅ Google Calendar event updated successfully')
        } else {
          console.warn('⚠️ No admin with active Google OAuth connection found - skipping calendar update')
        }
      } catch (error) {
        console.error('❌ Failed to update Google Calendar event:', error)
        // Don't fail the booking update if calendar update fails
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId) // Ensure we only update bookings in the correct company
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send notification to user if meeting was rescheduled
    if (isRescheduling && whopUser.role === 'admin' && booking.member_id) {
      try {
        const { notificationService } = await import('@/lib/services/notificationService')

        // Format the new time nicely
        const newStartTime = updateData.booking_start_time || booking.booking_start_time
        const newStartDate = new Date(newStartTime)
        const formattedTime = newStartDate.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        await notificationService.sendNotificationToUser(
          booking.member_id,
          companyId,
          '📅 Meeting Rescheduled',
          `Your meeting "${booking.title}" has been rescheduled to ${formattedTime}. Please check your updated calendar for details.`,
          undefined,
          false
        )

        console.log('✅ Reschedule notification sent to user')
      } catch (error) {
        console.error('❌ Failed to send reschedule notification:', error)
        // Don't fail the booking update if notification fails
      }
    }

    // Phase 1: Fetch recordings immediately when user manually finishes meeting
    if (isCompleting) {
      try {
        const { recordingFetchService } = await import('@/lib/services/recordingFetchService')

        // Mark immediate fetch attempt
        await supabase
          .from('bookings')
          .update({ recording_fetch_immediate: true })
          .eq('id', id)

        // Fetch recordings in background (don't wait for it)
        recordingFetchService.fetchRecordingsForBooking(id, companyId).catch(() => {
          // Failed to fetch recordings
        })
      } catch (error) {
        // Don't fail the request if recording fetch fails
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/:id - Delete booking
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify Whop authentication and company access
    const { requireWhopAuth } = await import('@/lib/auth/whop')
    const whopUser = await requireWhopAuth(companyId, true)

    // Get the booking to check ownership
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('member_id, company_id, calendar_event_id')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check permissions: admins can delete any booking, members can only delete their own
    if (whopUser.role === 'member' && booking.member_id !== whopUser.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own bookings' },
        { status: 403 }
      )
    }

    // Verify company_id matches
    if (booking.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Booking does not belong to this company' },
        { status: 403 }
      )
    }

    // Delete Google Calendar event if it exists
    if (booking.calendar_event_id) {
      try {
        console.log('🗑️ Booking deleted - deleting Google Calendar event...')
        const { meetingService } = await import('@/lib/services/meetingService')

        // First, get an active Google OAuth connection
        const { data: oauthConnection } = await supabase
          .from('oauth_connections')
          .select('user_id')
          .eq('provider', 'google')
          .eq('is_active', true)
          .limit(1)
          .single()

        // Find an admin user who has an active Google OAuth connection
        let adminUserId: string | null = null

        if (oauthConnection?.user_id) {
          // Verify this user is an admin
          const { data: adminUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', oauthConnection.user_id)
            .eq('role', 'admin')
            .single()

          if (adminUser) {
            adminUserId = adminUser.id
          }
        }

        if (adminUserId) {
          await meetingService.deleteGoogleCalendarEvent(
            adminUserId,
            booking.calendar_event_id
          )
          console.log('✅ Google Calendar event deleted')
        } else {
          console.warn('⚠️ No admin with active Google OAuth connection found - skipping calendar deletion')
        }
      } catch (error) {
        console.error('❌ Failed to delete Google Calendar event:', error)
        // Don't fail the booking deletion if calendar deletion fails
      }
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Booking deleted' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
