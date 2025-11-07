import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { commonData, scheduleData, companyId } = body

    // Validate input
    if (!commonData || !scheduleData) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }

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

    // Only admins can create availability patterns
    if (whopUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Convert scheduleData to weekly_schedule JSONB format
    // Example: {"Mon": [{"start": "09:00", "end": "17:00"}]}
    const weeklySchedule: Record<string, Array<{start: string, end: string}>> = {}

    Object.entries(scheduleData.days).forEach(([dayKey, dayData]: [string, any]) => {
      if (dayData.enabled && dayData.timeRanges && dayData.timeRanges.length > 0) {
        weeklySchedule[dayKey] = dayData.timeRanges.map((range: any) => ({
          start: range.startTime,
          end: range.endTime,
        }))
      }
    })

    // Create the availability pattern
    const { data: pattern, error } = await supabase
      .from('availability_patterns')
      .insert({
        admin_id: whopUser.userId,
        title: commonData.title,
        description: commonData.description || null,
        duration_minutes: commonData.duration_minutes,
        price: commonData.price || 0,
        meeting_type: commonData.meeting_type,
        meeting_config: commonData.meeting_config,
        start_date: scheduleData.dateRange.start,
        end_date: scheduleData.dateRange.indefinite ? null : scheduleData.dateRange.end,
        weekly_schedule: weeklySchedule,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create availability pattern', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pattern,
      message: 'Availability pattern created successfully',
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch availability patterns
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
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
      .from('availability_patterns')
      .select('*')

    // Admins see their own patterns, members see all active patterns
    if (whopUser.role === 'admin') {
      // Use provided adminId or current user's ID
      const effectiveAdminId = adminId || whopUser.userId
      query = query.eq('admin_id', effectiveAdminId)
    } else {
      // Members can only see active patterns
      query = query.eq('is_active', true)
    }

    const { data: patterns, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch patterns' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      patterns: patterns || [],
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
