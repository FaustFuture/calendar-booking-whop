import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { meetingService } from '@/lib/services/meetingService'
import { OAuthProvider } from '@/lib/types/database'

// GET /api/bookings - List bookings
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('bookings')
      .select(`
        *,
        member:member_id(id, name, email),
        admin:admin_id(id, name, email),
        slot:slot_id(start_time, end_time)
      `)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Members only see their own bookings
    if (userData?.role === 'member') {
      query = query.eq('member_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create booking
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get slot or pattern details to check if meeting generation is needed
    let meetingUrl = body.meeting_url || null
    let meetingData = null
    let startTime = null
    let endTime = null

    console.log('📋 Booking request body:', {
      slot_id: body.slot_id,
      pattern_id: body.pattern_id,
      admin_id: body.admin_id,
      booking_start_time: body.booking_start_time,
      booking_end_time: body.booking_end_time,
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
      (meetingData.meeting_type === 'google_meet' || meetingData.meeting_type === 'zoom') &&
      meetingData.meeting_config?.requiresGeneration
    ) {
      console.log('🚀 Starting meeting link generation...')
      try {
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
          .eq('id', body.admin_id)
          .single()
        if (adminData?.email) attendeeEmails.push(adminData.email)

        // Generate meeting link
        const meetingResult = await meetingService.generateMeetingLink(
          body.admin_id, // Use admin's OAuth connection
          meetingData.meeting_type as OAuthProvider,
          {
            title: body.title || meetingData.title || 'Meeting',
            description: body.description || meetingData.description,
            startTime: startTime,
            endTime: endTime,
            attendees: attendeeEmails,
          }
        )

        meetingUrl = meetingResult.meetingUrl
        console.log('✅ Meeting link generated successfully:', meetingUrl)
      } catch (error) {
        console.error('❌ Failed to generate meeting link:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        // Continue with booking creation but without meeting URL
        // This prevents booking creation from failing if meeting generation fails
      }
    } else if (meetingData?.meeting_type === 'manual_link') {
      // Use manual link from config
      meetingUrl = meetingData.meeting_config?.manualValue || null
    } else if (meetingData?.meeting_type === 'location') {
      // For location, store address in notes or description
      meetingUrl = null
    }

    console.log('💾 Inserting booking with meeting_url:', meetingUrl ? '✅ Present' : '❌ Missing')

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...body,
        status: body.status || 'upcoming',
        meeting_url: meetingUrl,
      })
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
