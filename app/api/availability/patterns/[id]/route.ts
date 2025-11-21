import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

// PATCH /api/availability/patterns/:id - Update availability pattern
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commonData, scheduleData, recurrenceData, companyId, ...directUpdateData } = body

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

    // Only admins can update availability patterns
    if (whopUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify the pattern belongs to the company before updating
    const { data: existingPattern, error: fetchError } = await supabase
      .from('availability_patterns')
      .select('company_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      )
    }

    if (existingPattern.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden - Pattern does not belong to your company' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: any = {}

    // Handle structured update (commonData + scheduleData format like POST)
    if (commonData || scheduleData) {
      if (commonData) {
        if (commonData.title !== undefined) updateData.title = commonData.title
        if (commonData.description !== undefined) updateData.description = commonData.description || null
        if (commonData.duration_minutes !== undefined) updateData.duration_minutes = commonData.duration_minutes
        if (commonData.meeting_type !== undefined) updateData.meeting_type = commonData.meeting_type
        if (commonData.meeting_config !== undefined) updateData.meeting_config = commonData.meeting_config
      }

      if (scheduleData) {
        if (scheduleData.dateRange) {
          if (scheduleData.dateRange.start !== undefined) updateData.start_date = scheduleData.dateRange.start
          if (scheduleData.dateRange.end !== undefined) {
            updateData.end_date = scheduleData.dateRange.indefinite ? null : scheduleData.dateRange.end
          }
        }

        if (scheduleData.days) {
          // Convert scheduleData to weekly_schedule JSONB format
          const weeklySchedule: Record<string, Array<{start: string, end: string}>> = {}
          
          Object.entries(scheduleData.days).forEach(([dayKey, dayData]: [string, any]) => {
            if (dayData.enabled && dayData.timeRanges && dayData.timeRanges.length > 0) {
              weeklySchedule[dayKey] = dayData.timeRanges.map((range: any) => ({
                start: range.startTime,
                end: range.endTime,
              }))
            }
          })
          
          updateData.weekly_schedule = weeklySchedule
        }
      }

      // Handle recurrence data if provided
      if (recurrenceData) {
        Object.assign(updateData, recurrenceData)
      }
    } else {
      // Handle direct field updates (partial update)
      // Remove companyId and id from update data (not allowed to change)
      const { companyId: _, id: __, ...allowedFields } = directUpdateData
      
      // Only allow updating specific fields
      const allowedFieldNames = [
        'title',
        'description',
        'duration_minutes',
        'meeting_type',
        'meeting_config',
        'start_date',
        'end_date',
        'weekly_schedule',
        'timezone',
        'is_active',
        // Recurrence fields
        'is_recurring',
        'recurrence_type',
        'recurrence_interval',
        'recurrence_days_of_week',
        'recurrence_day_of_month',
        'recurrence_end_type',
        'recurrence_count',
        'recurrence_end_date'
      ]
      
      Object.keys(allowedFields).forEach(key => {
        if (allowedFieldNames.includes(key)) {
          updateData[key] = allowedFields[key]
        }
      })
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the pattern
    const { data: updatedPattern, error: updateError } = await supabase
      .from('availability_patterns')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update availability pattern', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pattern: updatedPattern,
      message: 'Availability pattern updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/availability/patterns/:id - Delete availability pattern
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { companyId } = body

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

    // Only admins can delete availability patterns
    if (whopUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify the pattern belongs to the company before deleting
    const { data: pattern, error: fetchError } = await supabase
      .from('availability_patterns')
      .select('company_id')
      .eq('id', id)
      .single()

    if (fetchError || !pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      )
    }

    if (pattern.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden - Pattern does not belong to your company' },
        { status: 403 }
      )
    }

    // Delete the pattern
    const { error: deleteError } = await supabase
      .from('availability_patterns')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete availability pattern', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Availability pattern deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

