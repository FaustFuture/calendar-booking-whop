import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { commonData, scheduleData, adminId } = body

    // Validate input
    if (!commonData || !scheduleData) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
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
        admin_id: effectiveAdminId,
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
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')

    // Determine effective admin ID
    let effectiveAdminId = adminId

    if (!effectiveAdminId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        effectiveAdminId = '00000000-0000-0000-0000-000000000001'
      } else {
        effectiveAdminId = user.id
      }
    }

    const { data: patterns, error } = await supabase
      .from('availability_patterns')
      .select('*')
      .eq('admin_id', effectiveAdminId)
      .order('created_at', { ascending: false })

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
