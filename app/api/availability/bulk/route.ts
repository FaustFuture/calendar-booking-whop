import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { commonData, timeSlots, adminId } = body

    // Validate input
    if (!commonData || !timeSlots || !Array.isArray(timeSlots)) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }

    if (timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'No time slots provided' },
        { status: 400 }
      )
    }

    // Determine admin ID: use provided adminId (for dev mode) or get from auth
    let effectiveAdminId = adminId

    if (!effectiveAdminId) {
      // Try to get from authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      effectiveAdminId = user.id
    }

    // Build full slots array by merging common data with time slots
    const slotsToCreate = timeSlots.map((slot: { start_time: string; end_time: string }) => ({
      admin_id: effectiveAdminId,
      title: commonData.title,
      description: commonData.description || null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: true,
      meeting_type: commonData.meeting_type,
      meeting_config: commonData.meeting_config,
    }))

    // Insert all slots in one transaction
    const { data, error } = await supabase
      .from('availability_slots')
      .insert(slotsToCreate)
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create slots', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      slots: data,
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
