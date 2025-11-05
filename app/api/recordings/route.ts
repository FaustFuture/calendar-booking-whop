import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/recordings - List recordings
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('recordings')
      .select(`
        *,
        booking:booking_id(
          id,
          title,
          member_id,
          admin_id
        )
      `)
      .order('uploaded_at', { ascending: false })

    // Filter by booking if provided
    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Members only see recordings for their bookings
    if (userData?.role === 'member') {
      const filtered = data?.filter(
        (rec: any) => rec.booking?.member_id === user.id
      )
      return NextResponse.json({ data: filtered })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/recordings - Create recording
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

    // Only admins can create recordings
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('recordings')
      .insert(body)
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
