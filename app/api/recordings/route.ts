import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWhopUserFromHeaders } from '@/lib/auth'

// GET /api/recordings - List recordings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const provider = searchParams.get('provider') // Filter by provider (google, zoom, manual)
    const status = searchParams.get('status') // Filter by status (processing, available, failed)
    const companyId = searchParams.get('companyId')

    // Require companyId for Whop multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Get authenticated Whop user
    const whopUser = await getWhopUserFromHeaders()
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

    // Filter by provider if provided
    if (provider && ['google', 'zoom', 'manual'].includes(provider)) {
      query = query.eq('provider', provider)
    }

    // Filter by status if provided
    if (status && ['processing', 'available', 'failed', 'deleted'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', whopUser.userId)
      .single()

    // Members only see recordings for their bookings
    if (userData?.role === 'member') {
      const filtered = data?.filter(
        (rec: any) => rec.booking?.member_id === whopUser.userId
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
    const body = await request.json()
    const { companyId } = body

    // Require companyId for Whop multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Get authenticated Whop user
    const whopUser = await getWhopUserFromHeaders()
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', whopUser.userId)
      .single()

    // Only admins can create recordings
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Set defaults for manual uploads
    const recordingData = {
      ...body,
      provider: body.provider || 'manual',
      status: body.status || 'available',
      recording_type: body.recording_type || 'cloud',
      auto_fetched: body.auto_fetched || false,
    }

    const { data, error } = await supabase
      .from('recordings')
      .insert(recordingData)
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
