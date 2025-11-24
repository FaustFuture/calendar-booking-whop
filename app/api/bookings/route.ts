import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { meetingService } from '@/lib/services/meetingService'
import { googleMeetService } from '@/lib/services/googleMeetService'
import { OAuthProvider } from '@/lib/types/database'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'
import { generateRecurringBookingTimes } from '@/lib/utils/recurrence'
import { randomUUID } from 'crypto'

// Helper function to map meeting_type to OAuth provider
function getOAuthProvider(meetingType: string): OAuthProvider {
  if (meetingType === 'zoom') return 'zoom'
  if (meetingType === 'google_meet') return 'google'
  throw new Error(`Invalid meeting type: ${meetingType}`)
}

// GET /api/bookings - List bookings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

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

    let query = supabase
      .from('bookings')
      .select(`
        *,
        member:member_id(id, name, email),
        slot:slot_id(start_time, end_time, title, description, meeting_type),
        pattern:pattern_id(id, title, description, meeting_type, duration_minutes, price),
        attachments:booking_attachments(id, file_name, file_path, file_size, mime_type, created_at)
      `)
      .eq('company_id', companyId) // Filter by company_id first
      .order('created_at', { ascending: false })

    // Filter by status if provided (supports comma-separated values)
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status', statuses)
      }
    }

    // Members only see their own bookings within the company
    if (whopUser.role === 'member') {
      query = query.eq('member_id', whopUser.userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookings: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create booking
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get companyId from request body (required for multi-tenancy)
    const { companyId } = body
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Optional: Verify Whop user if authenticated (guests allowed for bookings)
    let whopUser = null
    let isAuthenticatedBooking = false

    // If member_id is provided in the request, this is an authenticated booking
    if (body.member_id) {
      isAuthenticatedBooking = true
      try {
        whopUser = await requireWhopAuth(companyId, true)

        // CRITICAL: Sync authenticated user to Supabase BEFORE creating booking
        await syncWhopUserToSupabase(whopUser)
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to authenticate user. Please try refreshing the page and booking again.' },
          { status: 401 }
        )
      }
    }

    // Get slot or pattern details to check if meeting generation is needed
    let meetingUrl = body.meeting_url || null
    let meetingData = null
    let startTime = null
    let endTime = null
    
    // Find an admin in the company for meeting generation (if needed)
    // We'll determine this when we need to generate a meeting link
    let adminIdForMeeting: string | null = null

    // Check if this is a slot-based or pattern-based booking
    if (body.slot_id) {
      const { data: slotData } = await supabase
        .from('availability_slots')
        .select('meeting_type, meeting_config, start_time, end_time, title, description')
        .eq('id', body.slot_id)
        .single()

      meetingData = slotData
      startTime = slotData?.start_time
      endTime = slotData?.end_time
    } else if (body.pattern_id) {
      const { data: patternData } = await supabase
        .from('availability_patterns')
        .select('meeting_type, meeting_config, title, description, timezone, is_recurring, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_day_of_month, recurrence_end_type, recurrence_count, recurrence_end_date')
        .eq('id', body.pattern_id)
        .single()

      meetingData = patternData
      startTime = body.booking_start_time
      endTime = body.booking_end_time
    }

    // Check if meeting generation is required
    console.log('🔍 Checking if meeting generation is required...')
    console.log('Meeting Type:', meetingData?.meeting_type)
    console.log('Meeting Config:', meetingData?.meeting_config)
    console.log('Is Recurring:', meetingData?.is_recurring)

    // For recurring bookings, skip meeting generation here
    // The recurring loop will handle creating meetings for each occurrence
    if (
      meetingData &&
      (meetingData.meeting_type === 'zoom' || meetingData.meeting_type === 'google_meet') &&
      meetingData.meeting_config?.requiresGeneration &&
      !meetingData.is_recurring // Skip for recurring bookings
    ) {

      console.log('✅ Meeting generation IS required')
      console.log('meetingData', meetingData)

      // Check if provider is configured before attempting generation
      let providerConfigured = false
      if (meetingData.meeting_type === 'zoom') {
        // Zoom uses Server-to-Server OAuth
        providerConfigured = !!(
          process.env.ZOOM_ACCOUNT_ID &&
          process.env.ZOOM_CLIENT_ID &&
          process.env.ZOOM_CLIENT_SECRET
        )
      } else if (meetingData.meeting_type === 'google_meet') {
        // Google Meet uses user OAuth connections - will check later when we have adminId
        providerConfigured = true // Will verify connection exists when we have the admin user
      }

      if (!providerConfigured) {
        console.log('⚠️ Provider not configured - skipping meeting generation')
        // Continue without meeting URL - booking will be created but without link
      } else {
        console.log('✅ Provider is configured')
        try {
          // Find an admin in the company for OAuth connection
          console.log('🔍 Looking for admin user for OAuth connection...')
          if (!adminIdForMeeting) {
            // First, try to use the authenticated user if they're an admin
            if (whopUser && whopUser.role === 'admin') {
              adminIdForMeeting = whopUser.userId
              console.log('✅ Using authenticated admin user:', adminIdForMeeting)
            } else {
              console.log('🔍 Authenticated user is not admin, looking for any admin...')
              // Find any admin user (Note: users table doesn't have company_id,
              // but we use company_id from bookings/patterns for multi-tenancy)
              const { data: adminUser } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single()

              if (adminUser) {
                adminIdForMeeting = adminUser.id
                console.log('✅ Found admin user:', adminIdForMeeting)
              } else {
                console.log('❌ No admin user found in database')
              }
            }
          } else {
            console.log('✅ Admin ID already set:', adminIdForMeeting)
          }

          if (!adminIdForMeeting) {
            throw new Error('No admin found in company for meeting generation')
          }

          // For Google Meet, verify the admin has an active OAuth connection
          if (meetingData.meeting_type === 'google_meet') {
            console.log('🔍 Checking Google OAuth connection for admin:', adminIdForMeeting)
            const hasConnection = await meetingService.hasActiveConnection(adminIdForMeeting, 'google')
            console.log('Has active Google connection:', hasConnection)
            if (!hasConnection) {
              throw new Error('Google Meet not connected. Please connect your Google account in Settings → Integrations.')
            }
          }

          // Get attendee emails
          console.log('📧 Collecting attendee emails...')
          const attendeeEmails: string[] = []

          // Add member email (if registered user)
          if (body.member_id) {
            const { data: memberData } = await supabase
              .from('users')
              .select('email')
              .eq('id', body.member_id)
              .single()
            if (memberData?.email) {
              attendeeEmails.push(memberData.email)
              console.log('Added member email:', memberData.email)
            }
          } else if (body.guest_email) {
            // Add guest email
            attendeeEmails.push(body.guest_email)
            console.log('Added guest email:', body.guest_email)
          }

          // Add admin email
          const { data: adminData } = await supabase
            .from('users')
            .select('email')
            .eq('id', adminIdForMeeting)
            .single()
          if (adminData?.email) {
            attendeeEmails.push(adminData.email)
            console.log('Added admin email:', adminData.email)
          }

          console.log('Total attendees:', attendeeEmails.length)

          // Generate meeting link
          const provider = getOAuthProvider(meetingData.meeting_type)
          console.log('🚀 Calling meetingService.generateMeetingLink...')
          console.log('Provider:', provider)
          console.log('Admin ID:', adminIdForMeeting)
          console.log('Start Time:', startTime)
          console.log('End Time:', endTime)
          console.log('Timezone:', meetingData?.timezone || body.timezone || 'UTC')

          const meetingResult = await meetingService.generateMeetingLink(
            adminIdForMeeting, // Use admin's OAuth connection
            provider,
            {
              title: body.title || meetingData.title || 'Meeting',
              description: body.description || meetingData.description,
              startTime: startTime,
              endTime: endTime,
              attendees: attendeeEmails,
              timezone: meetingData?.timezone || body.timezone || 'UTC', // Use pattern's timezone, fallback to client timezone
              enableRecording: meetingData.meeting_config?.enableRecording ?? true, // Enable recording by default
            }
          )

          console.log('✅ Meeting generation completed successfully')
          console.log('Meeting Result:', {
            meetingUrl: meetingResult.meetingUrl,
            meetingId: meetingResult.meetingId,
            provider: meetingData.meeting_type
          })

          meetingUrl = meetingResult.meetingUrl

          // Store calendar event ID for Google Meet bookings (for later deletion/sync)
          if (meetingData.meeting_type === 'google_meet' && meetingResult.meetingId) {
            body.calendar_event_id = meetingResult.meetingId
            console.log('📅 Google Calendar event created:', meetingResult.meetingId)
            console.log('✅ Calendar event ID will be stored in booking record')
          } else if (meetingData.meeting_type === 'google_meet') {
            console.log('⚠️ No meetingId returned from Google Meet generation')
          }
        } catch (error) {
          console.error('❌ Failed to generate meeting link:', error)
          console.error('Error details:', error instanceof Error ? error.message : String(error))
          // Continue with booking creation but without meeting URL
          // This prevents booking creation from failing if meeting generation fails
        }
      }
    } else {
      console.log('ℹ️ Meeting generation NOT required')
      if (meetingData) {
        console.log('Reason: meeting_type =', meetingData.meeting_type, ', requiresGeneration =', meetingData.meeting_config?.requiresGeneration)
      } else {
        console.log('Reason: No meetingData found')
      }
    }

    if (meetingData?.meeting_type === 'manual_link') {
      // Use manual link from config
      meetingUrl = meetingData.meeting_config?.manualValue || null
    } else if (meetingData?.meeting_type === 'location') {
      // For location, store address in notes or description
      meetingUrl = null
    }

    // Create Google Calendar event for ALL meeting types (not just google_meet)
    // This ensures all bookings appear on the admin's calendar
    // Skip this for recurring bookings - they will create their own calendar events
    if (meetingData && startTime && endTime && !body.calendar_event_id && !meetingData.is_recurring) {
      console.log('📅 Creating Google Calendar event for meeting type:', meetingData.meeting_type)

      try {
        // Find an admin with Google Calendar access
        let calendarAdminId = adminIdForMeeting // May already be set from meeting generation

        if (!calendarAdminId) {
          console.log('🔍 Finding admin for calendar event creation...')
          if (whopUser && whopUser.role === 'admin') {
            calendarAdminId = whopUser.userId
          } else {
            const { data: adminUser } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin')
              .limit(1)
              .single()

            if (adminUser) {
              calendarAdminId = adminUser.id
            }
          }
        }

        if (calendarAdminId) {
          console.log('✅ Admin found for calendar:', calendarAdminId)

          // Check if admin has Google Calendar connected
          const hasGoogleConnection = await meetingService.hasActiveConnection(calendarAdminId, 'google')

          if (hasGoogleConnection) {
            console.log('✅ Admin has Google Calendar connected')

            // Collect attendee emails
            const calendarAttendees: string[] = []

            if (body.member_id) {
              const { data: memberData } = await supabase
                .from('users')
                .select('email')
                .eq('id', body.member_id)
                .single()
              if (memberData?.email) calendarAttendees.push(memberData.email)
            } else if (body.guest_email) {
              calendarAttendees.push(body.guest_email)
            }

            const { data: adminData } = await supabase
              .from('users')
              .select('email')
              .eq('id', calendarAdminId)
              .single()
            if (adminData?.email) calendarAttendees.push(adminData.email)

            // Build description and location based on meeting type
            let eventDescription = body.description || meetingData.description || ''
            let eventLocation = ''

            if (meetingData.meeting_type === 'zoom') {
              eventDescription += `\n\n🎥 Zoom Meeting\nJoin URL: ${meetingUrl || 'To be provided'}`
            } else if (meetingData.meeting_type === 'google_meet') {
              // Google Meet already has the link in the event
              eventDescription += `\n\n📹 Google Meet`
            } else if (meetingData.meeting_type === 'manual_link') {
              eventDescription += `\n\n🔗 Meeting Link: ${meetingUrl || 'To be provided'}`
            } else if (meetingData.meeting_type === 'location') {
              const locationAddress = meetingData.meeting_config?.manualValue || 'Location to be determined'
              eventLocation = locationAddress
              eventDescription += `\n\n📍 In-Person Meeting\nLocation: ${locationAddress}`
            }

            // Create the calendar event using the Google Meet service
            console.log('🚀 Creating calendar event...')
            const calendarResult = await googleMeetService.createCalendarEvent(
              calendarAdminId,
              {
                title: body.title || meetingData.title || 'Meeting',
                description: eventDescription,
                startTime: startTime,
                endTime: endTime,
                attendees: calendarAttendees,
                timezone: meetingData?.timezone || body.timezone || 'UTC',
                location: eventLocation,
                // For non-Google Meet meetings, don't create a Meet link
                conferenceData: meetingData.meeting_type === 'google_meet' && !meetingUrl ? undefined : null,
              }
            )

            if (calendarResult.eventId) {
              body.calendar_event_id = calendarResult.eventId
              console.log('✅ Google Calendar event created:', calendarResult.eventId)
            }
          } else {
            console.log('⚠️ Admin does not have Google Calendar connected - skipping calendar event')
          }
        } else {
          console.log('⚠️ No admin found - skipping calendar event')
        }
      } catch (error) {
        console.error('❌ Failed to create calendar event:', error)
        console.error('Error details:', error instanceof Error ? error.message : String(error))
        // Continue with booking creation even if calendar event fails
      }
    }

    // Extract companyId from body (used for auth only, not a DB column)
    const { companyId: _, ...bookingData } = body

    const insertData = {
      ...bookingData,
      company_id: companyId, // Use company_id instead of admin_id
      status: bookingData.status || 'upcoming',
      meeting_url: meetingUrl,
      // Set title and description from pattern/slot if not provided
      title: bookingData.title || meetingData?.title || 'Booking',
      description: bookingData.description || meetingData?.description,
      // Store pattern's timezone for accurate display later
      timezone: meetingData?.timezone || bookingData.timezone || 'UTC',
    }

    console.log('📝 Booking data before database insert:', insertData)

    // Check if this is a recurring pattern
    if (meetingData?.is_recurring && meetingData.recurrence_type && startTime && endTime) {
      console.log('🔁 Creating recurring bookings...')
      console.log('Recurrence config:', {
        type: meetingData.recurrence_type,
        interval: meetingData.recurrence_interval,
        daysOfWeek: meetingData.recurrence_days_of_week,
        dayOfMonth: meetingData.recurrence_day_of_month,
        endType: meetingData.recurrence_end_type,
        count: meetingData.recurrence_count,
        endDate: meetingData.recurrence_end_date,
      })

      // Generate all occurrence times
      const occurrences = generateRecurringBookingTimes(
        startTime,
        endTime,
        {
          type: meetingData.recurrence_type,
          interval: meetingData.recurrence_interval || 1,
          daysOfWeek: meetingData.recurrence_days_of_week,
          dayOfMonth: meetingData.recurrence_day_of_month,
          endType: meetingData.recurrence_end_type,
          count: meetingData.recurrence_count,
          endDate: meetingData.recurrence_end_date,
        }
      )

      console.log(`📅 Generated ${occurrences.length} recurring occurrences`)

      // Generate UUID for recurrence group
      const recurrenceGroupId = randomUUID()

      // Get admin for calendar events
      // For recurring bookings, we need to find an admin even if initial meeting generation was skipped
      let calendarAdminId = adminIdForMeeting

      if (!calendarAdminId) {
        console.log('🔍 Finding admin for recurring calendar events...')
        // First, try to use the authenticated user if they're an admin
        if (whopUser && whopUser.role === 'admin') {
          calendarAdminId = whopUser.userId
          console.log('✅ Using authenticated admin user:', calendarAdminId)
        } else {
          console.log('🔍 Authenticated user is not admin, looking for any admin...')
          // Find any admin user
          const { data: adminUsers } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .limit(1)

          if (adminUsers && adminUsers.length > 0) {
            calendarAdminId = adminUsers[0].id
            console.log('✅ Found admin user:', calendarAdminId)
          } else {
            console.log('❌ No admin user found in database')
          }
        }
      }

      // Check if admin has Google Calendar connected (needed for recurring events)
      let hasGoogleCalendar = false
      if (calendarAdminId) {
        hasGoogleCalendar = await meetingService.hasActiveConnection(calendarAdminId, 'google')
        console.log('Admin has Google Calendar connected:', hasGoogleCalendar)
        if (!hasGoogleCalendar) {
          console.log('⚠️ Admin does not have Google Calendar connected - recurring calendar events will not be created')
        }
      } else {
        console.log('❌ No admin found - cannot create recurring calendar events')
      }

      // Create booking records for all occurrences
      const bookingsToInsert = []
      const calendarEventPromises = []

      for (let i = 0; i < occurrences.length; i++) {
        const occurrence = occurrences[i]
        const occurrenceStartTime = occurrence.start.toISOString()
        const occurrenceEndTime = occurrence.end.toISOString()

        // Generate Zoom meeting for this occurrence if needed (independent of Google Calendar)
        let occurrenceMeetingUrl = meetingUrl // Default to the original meeting URL
        if (meetingData.meeting_type === 'zoom' && meetingData.meeting_config?.requiresGeneration && calendarAdminId) {
          console.log(`🎥 Generating Zoom meeting for occurrence ${i + 1}/${occurrences.length}`)
          try {
            // Collect attendee emails for Zoom
            const zoomAttendees: string[] = []
            if (body.member_id) {
              const { data: memberData } = await supabase
                .from('users')
                .select('email')
                .eq('id', body.member_id)
                .single()
              if (memberData?.email) zoomAttendees.push(memberData.email)
            } else if (body.guest_email) {
              zoomAttendees.push(body.guest_email)
            }

            const { data: adminData } = await supabase
              .from('users')
              .select('email')
              .eq('id', calendarAdminId)
              .single()
            if (adminData?.email) zoomAttendees.push(adminData.email)

            // Generate Zoom meeting
            const zoomResult = await meetingService.generateMeetingLink(
              calendarAdminId,
              'zoom',
              {
                title: insertData.title || 'Booking',
                description: insertData.description || '',
                startTime: occurrenceStartTime,
                endTime: occurrenceEndTime,
                attendees: zoomAttendees,
                timezone: insertData.timezone,
                enableRecording: meetingData.meeting_config?.enableRecording ?? true,
              }
            )

            occurrenceMeetingUrl = zoomResult.meetingUrl
            console.log(`✅ Zoom meeting created for occurrence ${i + 1}: ${occurrenceMeetingUrl}`)
          } catch (error) {
            console.error(`❌ Failed to generate Zoom meeting for occurrence ${i + 1}:`, error)
            // Continue without Zoom link
          }
        }

        // Create calendar event for this occurrence if we have an admin with Google Calendar
        let occurrenceCalendarEventId = null
        if (calendarAdminId && hasGoogleCalendar) {
          try {
            console.log(`📅 Creating calendar event for occurrence ${i + 1}/${occurrences.length}`)

            // Build event description
            let eventDescription = insertData.description || `Booking with ${insertData.customer_name || 'Customer'}`
            let eventLocation = ''

            if (meetingData.meeting_type === 'zoom') {
              eventDescription += `\n\n🎥 Zoom Meeting\nJoin URL: ${occurrenceMeetingUrl || 'To be provided'}`
            } else if (meetingData.meeting_type === 'manual_link') {
              eventDescription += `\n\n🔗 Meeting Link: ${meetingUrl || 'To be provided'}`
            } else if (meetingData.meeting_type === 'location') {
              const locationAddress = meetingData.meeting_config?.manualValue || 'Location to be determined'
              eventLocation = locationAddress
              eventDescription += `\n\n📍 In-Person Meeting\nLocation: ${locationAddress}`
            } else if (meetingData.meeting_type === 'google_meet') {
              eventDescription += `\n\n📹 Google Meet (link will be in the calendar event)`
            }

            // Add customer details
            eventDescription += `\n\n👤 Customer: ${insertData.customer_name || 'N/A'}`
            if (insertData.customer_email) {
              eventDescription += `\n📧 Email: ${insertData.customer_email}`
            }
            if (insertData.customer_phone) {
              eventDescription += `\n📱 Phone: ${insertData.customer_phone}`
            }

            // For Google Meet, create conference data to generate a unique Meet link for each occurrence
            let conferenceData = null
            if (meetingData.meeting_type === 'google_meet') {
              conferenceData = {
                createRequest: {
                  requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}-${i}`,
                  conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                  },
                },
              }
              console.log(`🎥 Creating Google Meet conference for occurrence ${i + 1}`)
            }

            // Collect attendees for this occurrence
            const calendarAttendees: string[] = []

            // Add customer email
            if (body.member_id) {
              const { data: memberData } = await supabase
                .from('users')
                .select('email')
                .eq('id', body.member_id)
                .single()
              if (memberData?.email) {
                calendarAttendees.push(memberData.email)
                console.log('Added member email to occurrence:', memberData.email)
              }
            } else if (body.guest_email) {
              calendarAttendees.push(body.guest_email)
              console.log('Added guest email to occurrence:', body.guest_email)
            }

            // Add admin email
            const { data: adminData } = await supabase
              .from('users')
              .select('email')
              .eq('id', calendarAdminId)
              .single()
            if (adminData?.email) {
              calendarAttendees.push(adminData.email)
              console.log('Added admin email to occurrence:', adminData.email)
            }

            console.log(`Total attendees for occurrence ${i + 1}:`, calendarAttendees.length)

            const calendarResult = await googleMeetService.createCalendarEvent(
              calendarAdminId,
              {
                title: insertData.title || 'Booking',
                description: eventDescription,
                startTime: occurrenceStartTime,
                endTime: occurrenceEndTime,
                attendees: calendarAttendees,
                timezone: insertData.timezone,
                location: eventLocation || undefined,
                conferenceData: conferenceData,
              }
            )

            occurrenceCalendarEventId = calendarResult.eventId

            // Store the meeting URL for this specific occurrence if it was created
            if (calendarResult.meetingUrl) {
              occurrenceMeetingUrl = calendarResult.meetingUrl
              console.log(`✅ Google Meet link created for occurrence ${i + 1}: ${occurrenceMeetingUrl}`)
            }

            console.log(`✅ Calendar event created for occurrence ${i + 1}: ${occurrenceCalendarEventId}`)
          } catch (error) {
            console.error(`❌ Failed to create calendar event for occurrence ${i + 1}:`, error)
            // Continue with booking creation even if calendar event fails
          }
        }

        // Add booking data for this occurrence
        bookingsToInsert.push({
          ...insertData,
          booking_start_time: occurrenceStartTime,
          booking_end_time: occurrenceEndTime,
          meeting_url: occurrenceMeetingUrl, // Use the occurrence-specific meeting URL
          recurrence_group_id: recurrenceGroupId,
          recurrence_index: i,
          is_recurring_instance: true,
          calendar_event_id: occurrenceCalendarEventId,
        })
      }

      // Insert all bookings
      const { data: allBookings, error: batchError } = await supabase
        .from('bookings')
        .insert(bookingsToInsert)
        .select()

      if (batchError) {
        console.error('❌ Database batch insert failed:', batchError)
        return NextResponse.json({ error: batchError.message }, { status: 400 })
      }

      console.log(`✅ Created ${allBookings.length} recurring bookings successfully!`)
      console.log('Recurrence Group ID:', recurrenceGroupId)
      console.log('Booking IDs:', allBookings.map(b => b.id))

      return NextResponse.json({
        data: allBookings,
        recurrence_group_id: recurrenceGroupId,
        total_bookings: allBookings.length,
      }, { status: 201 })
    }

    // Single booking (non-recurring)
    const { data, error } = await supabase
      .from('bookings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Booking created successfully!')
    console.log('Booking ID:', data.id)
    console.log('Has meeting URL:', !!data.meeting_url)
    console.log('Has calendar_event_id:', !!data.calendar_event_id)
    if (data.calendar_event_id) {
      console.log('Calendar Event ID:', data.calendar_event_id)
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
