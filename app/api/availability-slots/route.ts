import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWhopUserFromHeaders } from '@/lib/auth'

// GET /api/availability-slots - List availability slots
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const isAvailable = searchParams.get('is_available')
    const adminId = searchParams.get('admin_id')
    const companyId = searchParams.get('companyId')

    // Require companyId for Whop multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Optional auth - guests can view availability
    const whopUser = await getWhopUserFromHeaders()

    const supabase = await createClient()
    let query = supabase
      .from('availability_slots')
      .select('*')
      .order('start_time', { ascending: true })

    // Filter by availability
    if (isAvailable !== null) {
      query = query.eq('is_available', isAvailable === 'true')
    }

    // Filter by admin
    if (adminId) {
      query = query.eq('admin_id', adminId)
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

// POST /api/availability-slots - Create availability slot (Admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Require companyId
    const { companyId } = body
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

    // Get user role from Supabase
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', whopUser.userId)
      .single()

    // Only admins can create availability slots
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('availability_slots')
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
