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

    // Only admins can create bookings via API
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get slot details to check if meeting generation is needed
    let meetingUrl = body.meeting_url || null

    if (body.slot_id) {
      const { data: slotData } = await supabase
        .from('availability_slots')
        .select('meeting_type, meeting_config, start_time, end_time, title, description')
        .eq('id', body.slot_id)
        .single()

      // Check if meeting generation is required
      if (
        slotData &&
        (slotData.meeting_type === 'google_meet' || slotData.meeting_type === 'zoom') &&
        slotData.meeting_config?.requiresGeneration
      ) {
        try {
          // Get member and admin emails for attendees
          const { data: memberData } = await supabase
            .from('users')
            .select('email')
            .eq('id', body.member_id)
            .single()

          const { data: adminData } = await supabase
            .from('users')
            .select('email')
            .eq('id', body.admin_id)
            .single()

          const attendeeEmails = [memberData?.email, adminData?.email].filter(Boolean) as string[]

          // Generate meeting link
          const meetingResult = await meetingService.generateMeetingLink(
            body.admin_id, // Use admin's OAuth connection
            slotData.meeting_type as OAuthProvider,
            {
              title: body.title || slotData.title || 'Meeting',
              description: body.description || slotData.description,
              startTime: slotData.start_time,
              endTime: slotData.end_time,
              attendees: attendeeEmails,
            }
          )

          meetingUrl = meetingResult.meetingUrl
        } catch (error) {
          console.error('Failed to generate meeting link:', error)
          // Continue with booking creation but without meeting URL
          // This prevents booking creation from failing if meeting generation fails
        }
      } else if (slotData?.meeting_type === 'manual_link') {
        // Use manual link from slot config
        meetingUrl = slotData.meeting_config?.manualValue || null
      } else if (slotData?.meeting_type === 'location') {
        // For location, store address in notes or description
        meetingUrl = null
      }
    }

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
