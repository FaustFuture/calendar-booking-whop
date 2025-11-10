import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

// Helper function to map meeting_type to OAuth provider
function getOAuthProvider(meetingType: string): OAuthProvider {
  // Only Zoom is supported now
  if (meetingType === 'zoom') return 'zoom'
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

    console.log('🔍 Fetching bookings with query:', {
      role: whopUser.role,
      userId: whopUser.userId,
      filterByMemberId: whopUser.role === 'member',
      status
    })

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Bookings fetched successfully:', {
      count: data?.length || 0,
      bookings: data?.map(b => ({
        id: b.id,
        member_id: b.member_id,
        company_id: b.company_id,
        title: b.title,
        booking_start_time: b.booking_start_time,
        booking_end_time: b.booking_end_time,
        pattern_title: b.pattern?.title,
        meeting_url: b.meeting_url ? '✅' : '❌'
      }))
    })

    return NextResponse.json({ bookings: data })
  } catch (error) {
    console.error('❌ Unexpected error in GET /api/bookings:', error)
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
        console.log('✅ Authenticated user detected:', whopUser.userId)

        // CRITICAL: Sync authenticated user to Supabase BEFORE creating booking
        await syncWhopUserToSupabase(whopUser)
        console.log('✅ User synced to Supabase:', whopUser.userId)
      } catch (error) {
        console.error('❌ Failed to authenticate or sync user for booking:', error)
        return NextResponse.json(
          { error: 'Failed to authenticate user. Please try refreshing the page and booking again.' },
          { status: 401 }
        )
      }
    } else {
      // Guest booking
      console.log('👤 Guest booking (no authentication required)')
    }

    // Get slot or pattern details to check if meeting generation is needed
    let meetingUrl = body.meeting_url || null
    let meetingData = null
    let startTime = null
    let endTime = null
    
    // Find an admin in the company for meeting generation (if needed)
    // We'll determine this when we need to generate a meeting link
    let adminIdForMeeting: string | null = null

    console.log('📋 Booking request body:', {
      slot_id: body.slot_id,
      pattern_id: body.pattern_id,
      company_id: companyId,
      member_id: body.member_id,
      guest_email: body.guest_email,
      booking_start_time: body.booking_start_time,
      booking_end_time: body.booking_end_time,
      authenticatedUser: whopUser?.userId || 'guest'
    })

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
        .select('meeting_type, meeting_config, title, description')
        .eq('id', body.pattern_id)
        .single()

      console.log('📅 Pattern data fetched:', patternData)
      meetingData = patternData
      startTime = body.booking_start_time
      endTime = body.booking_end_time
    }

    console.log('🔍 Meeting data check:', {
      hasMeetingData: !!meetingData,
      meetingType: meetingData?.meeting_type,
      requiresGeneration: meetingData?.meeting_config?.requiresGeneration,
      startTime,
      endTime,
    })

    // Check if meeting generation is required
    if (
      meetingData &&
      meetingData.meeting_type === 'zoom' &&
      meetingData.meeting_config?.requiresGeneration
    ) {
      console.log('🚀 Starting meeting link generation...', {
        companyId,
        meetingType: meetingData.meeting_type,
        startTime,
        endTime,
      })

      // Check if Zoom is configured before attempting generation
      const zoomConfigured = !!(
        process.env.ZOOM_ACCOUNT_ID &&
        process.env.ZOOM_CLIENT_ID &&
        process.env.ZOOM_CLIENT_SECRET
      )

      if (!zoomConfigured) {
        console.error('❌ Zoom Server-to-Server OAuth not configured:', {
          hasAccountId: !!process.env.ZOOM_ACCOUNT_ID,
          hasClientId: !!process.env.ZOOM_CLIENT_ID,
          hasClientSecret: !!process.env.ZOOM_CLIENT_SECRET,
        })
        // Continue without meeting URL - booking will be created but without link
      } else {
        try {
          // Find an admin in the company for OAuth connection
          if (!adminIdForMeeting) {
            // First, try to use the authenticated user if they're an admin
            if (whopUser && whopUser.role === 'admin') {
              adminIdForMeeting = whopUser.userId
              console.log('📋 Using authenticated admin user for meeting:', adminIdForMeeting)
            } else {
              // Find any admin user (Note: users table doesn't have company_id, 
              // but we use company_id from bookings/patterns for multi-tenancy)
              const { data: adminUser, error: adminError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single()

              if (adminError) {
                console.error('❌ Error finding admin user:', adminError)
              }

              if (adminUser) {
                adminIdForMeeting = adminUser.id
                console.log('📋 Found admin in company for meeting:', adminIdForMeeting)
              } else {
                console.warn('⚠️ No admin found in company for meeting generation', {
                  companyId,
                  error: adminError?.message,
                })
              }
            }
          }

          if (!adminIdForMeeting) {
            throw new Error('No admin found in company for meeting generation')
          }

          // Get attendee emails
          const attendeeEmails: string[] = []

          // Add member email (if registered user)
          if (body.member_id) {
            const { data: memberData } = await supabase
              .from('users')
              .select('email')
              .eq('id', body.member_id)
              .single()
            if (memberData?.email) attendeeEmails.push(memberData.email)
          } else if (body.guest_email) {
            // Add guest email
            attendeeEmails.push(body.guest_email)
          }

          // Add admin email
          const { data: adminData } = await supabase
            .from('users')
            .select('email')
            .eq('id', adminIdForMeeting)
            .single()
          if (adminData?.email) attendeeEmails.push(adminData.email)

          // Generate meeting link
          const provider = getOAuthProvider(meetingData.meeting_type)
          console.log('🔗 Mapping meeting type to provider:', {
            meetingType: meetingData.meeting_type,
            provider,
            adminId: adminIdForMeeting,
            attendeeCount: attendeeEmails.length,
          })

          const meetingResult = await meetingService.generateMeetingLink(
            adminIdForMeeting, // Use admin's OAuth connection
            provider,
            {
              title: body.title || meetingData.title || 'Meeting',
              description: body.description || meetingData.description,
              startTime: startTime,
              endTime: endTime,
              attendees: attendeeEmails,
            }
          )

          meetingUrl = meetingResult.meetingUrl
          console.log('✅ Meeting link generated successfully:', {
            meetingUrl,
            meetingId: meetingResult.meetingId,
            provider: meetingResult.provider,
          })
        } catch (error) {
          // Enhanced error logging for production debugging
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStack = error instanceof Error ? error.stack : undefined
          const errorDetails = error instanceof Error ? { ...error } : error

          console.error('❌ Failed to generate meeting link:', {
            error: errorMessage,
            stack: errorStack,
            details: errorDetails,
            companyId,
            meetingType: meetingData.meeting_type,
            adminId: adminIdForMeeting,
            startTime,
            endTime,
          })

          // Log specific error types
          if (errorMessage.includes('not configured')) {
            console.error('❌ Zoom configuration issue - check environment variables')
          } else if (errorMessage.includes('token')) {
            console.error('❌ Zoom OAuth token generation failed')
          } else if (errorMessage.includes('meeting')) {
            console.error('❌ Zoom meeting creation failed')
          }

          // Continue with booking creation but without meeting URL
          // This prevents booking creation from failing if meeting generation fails
        }
      }
    } else if (meetingData?.meeting_type === 'manual_link') {
      // Use manual link from config
      meetingUrl = meetingData.meeting_config?.manualValue || null
    } else if (meetingData?.meeting_type === 'location') {
      // For location, store address in notes or description
      meetingUrl = null
    }

    console.log('💾 Inserting booking with meeting_url:', meetingUrl ? '✅ Present' : '❌ Missing')

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
    }

    console.log('📝 Actual data being inserted into database:', {
      member_id: insertData.member_id,
      company_id: insertData.company_id,
      pattern_id: insertData.pattern_id,
      slot_id: insertData.slot_id,
      guest_name: insertData.guest_name,
      guest_email: insertData.guest_email,
      status: insertData.status,
      title: insertData.title,
      description: insertData.description,
      booking_start_time: insertData.booking_start_time,
      booking_end_time: insertData.booking_end_time,
      hasMeetingUrl: !!insertData.meeting_url
    })

    const { data, error } = await supabase
      .from('bookings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Booking created in database:', {
      id: data.id,
      member_id: data.member_id,
      company_id: data.company_id,
      status: data.status,
      title: data.title,
      description: data.description,
      booking_start_time: data.booking_start_time,
      booking_end_time: data.booking_end_time,
      meeting_url: data.meeting_url ? '✅ Present' : '❌ Missing',
      guest_name: data.guest_name,
      guest_email: data.guest_email
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
