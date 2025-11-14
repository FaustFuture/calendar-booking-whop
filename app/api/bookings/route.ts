import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

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
        .select('meeting_type, meeting_config, title, description')
        .eq('id', body.pattern_id)
        .single()

      meetingData = patternData
      startTime = body.booking_start_time
      endTime = body.booking_end_time
    }

    // Check if meeting generation is required
    if (
      meetingData &&
      (meetingData.meeting_type === 'zoom' || meetingData.meeting_type === 'google_meet') &&
      meetingData.meeting_config?.requiresGeneration
    ) {

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
        // Continue without meeting URL - booking will be created but without link
      } else {
        try {
          // Find an admin in the company for OAuth connection
          if (!adminIdForMeeting) {
            // First, try to use the authenticated user if they're an admin
            if (whopUser && whopUser.role === 'admin') {
              adminIdForMeeting = whopUser.userId
            } else {
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
              }
            }
          }

          if (!adminIdForMeeting) {
            throw new Error('No admin found in company for meeting generation')
          }

          // For Google Meet, verify the admin has an active OAuth connection
          if (meetingData.meeting_type === 'google_meet') {
            const hasConnection = await meetingService.hasActiveConnection(adminIdForMeeting, 'google')
            if (!hasConnection) {
              throw new Error('Google Meet not connected. Please connect your Google account in Settings → Integrations.')
            }
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

          const meetingResult = await meetingService.generateMeetingLink(
            adminIdForMeeting, // Use admin's OAuth connection
            provider,
            {
              title: body.title || meetingData.title || 'Meeting',
              description: body.description || meetingData.description,
              startTime: startTime,
              endTime: endTime,
              attendees: attendeeEmails,
              enableRecording: meetingData.meeting_config?.enableRecording ?? true, // Enable recording by default
            }
          )

          meetingUrl = meetingResult.meetingUrl
        } catch (error) {
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

    console.log('📝 Booking data before database insert:', insertData)

    const { data, error } = await supabase
      .from('bookings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
