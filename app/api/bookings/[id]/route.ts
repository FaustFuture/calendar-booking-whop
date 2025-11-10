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
      .select('member_id, company_id, status')
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

    // Check if status is being changed to 'completed'
    const isCompleting = updateData.status === 'completed' && booking.status !== 'completed'

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
        recordingFetchService.fetchRecordingsForBooking(id, companyId).catch((error) => {
          console.error(`Failed to fetch recordings for booking ${id} (immediate):`, error)
        })
      } catch (error) {
        console.error(`Error triggering immediate recording fetch for booking ${id}:`, error)
        // Don't fail the request if recording fetch fails
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating booking:', error)
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
      .select('member_id, company_id')
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

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Booking deleted' })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
