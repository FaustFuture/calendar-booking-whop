/**
 * Calendar Events Endpoint
 * GET /api/calendar/events
 * Fetches Google Calendar events for conflict checking when viewing availability patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'
import { googleMeetService } from '@/lib/services/googleMeetService'
import { calendarCache } from '@/lib/utils/calendarCache'
import { CalendarBusyTime } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  console.log('🚀 Calendar Events API endpoint called!')

  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId')
    const patternId = searchParams.get('patternId')
    const startDate = searchParams.get('startDate') // YYYY-MM-DD format
    const endDate = searchParams.get('endDate') // YYYY-MM-DD format

    console.log('📥 Request params:', { companyId, patternId, startDate, endDate })

    // Validate required parameters
    if (!companyId) {
      console.log('❌ Missing companyId')
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!patternId) {
      console.log('❌ Missing patternId')
      return NextResponse.json({ error: 'patternId is required' }, { status: 400 })
    }

    if (!startDate || !endDate) {
      console.log('❌ Missing date range')
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Verify Whop authentication and company access
    console.log('🔐 Verifying Whop authentication...')
    await requireWhopAuth(companyId, true)
    console.log('✅ Authentication verified')

    const supabase = await createClient()

    // Get the availability pattern to find the creator
    console.log('🔍 Looking up availability pattern...')
    const { data: pattern, error: patternError } = await supabase
      .from('availability_patterns')
      .select('id, created_by, company_id, title')
      .eq('id', patternId)
      .single()

    if (patternError || !pattern) {
      console.log('❌ Pattern not found:', patternError)
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    console.log('✅ Pattern found:', pattern)

    // Verify pattern belongs to this company
    if (pattern.company_id !== companyId) {
      console.log('❌ Pattern does not belong to this company')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If no creator is set, return empty busy times
    if (!pattern.created_by) {
      console.log('⚠️ Pattern has no created_by field - cannot fetch calendar events')
      console.log('💡 This pattern was created before the created_by field was added')
      return NextResponse.json({
        busyTimes: [],
        cached: false,
        message: 'No creator set for this pattern',
      })
    }

    console.log('👤 Pattern creator:', pattern.created_by)

    // Check cache first
    console.log('💾 Checking cache...')
    const cached = calendarCache.get(pattern.created_by, startDate, endDate)
    if (cached) {
      console.log('✅ Cache hit! Returning cached data')
      return NextResponse.json({
        busyTimes: cached.busyTimes,
        cached: true,
        cacheExpiry: cached.expiry.toISOString(),
      })
    }
    console.log('❌ Cache miss - fetching from Google Calendar')

    // Get OAuth connection for the pattern creator
    console.log('🔍 Looking up OAuth connection...')
    const { data: connection, error: connectionError } = await supabase
      .from('oauth_connections')
      .select('access_token, refresh_token, expires_at, scope')
      .eq('user_id', pattern.created_by)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      console.log('❌ No Google OAuth connection found for user:', pattern.created_by)
      console.log('Error:', connectionError)
      return NextResponse.json({
        busyTimes: [],
        cached: false,
        message: 'Pattern creator has not connected Google Calendar',
      })
    }

    console.log('✅ OAuth connection found')
    console.log('📋 Scope:', connection.scope)

    // Check if the connection has the required scope
    const hasReadScope =
      connection.scope?.includes('calendar.readonly') ||
      connection.scope?.includes('calendar.events')

    console.log('🔑 Has required scope?', hasReadScope)

    if (!hasReadScope) {
      console.log('❌ Missing calendar.readonly scope - need to reconnect')
      return NextResponse.json({
        busyTimes: [],
        cached: false,
        requiresReconnect: true,
        message: 'Google Calendar connection needs to be updated with new permissions',
      })
    }

    // Check if token needs refresh
    let accessToken = connection.access_token
    const expiresAt = new Date(connection.expires_at)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()

    // Refresh if token expires in less than 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      if (!connection.refresh_token) {
        return NextResponse.json({
          busyTimes: [],
          cached: false,
          requiresReconnect: true,
          message: 'Access token expired and no refresh token available',
        })
      }

      try {
        const refreshResult = await googleMeetService.refreshAccessToken(
          connection.refresh_token
        )

        // Update connection in database
        const newExpiresAt = new Date(Date.now() + refreshResult.expires_in * 1000)
        await supabase
          .from('oauth_connections')
          .update({
            access_token: refreshResult.access_token,
            expires_at: newExpiresAt.toISOString(),
            refresh_token: refreshResult.refresh_token || connection.refresh_token,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', pattern.created_by)
          .eq('provider', 'google')

        accessToken = refreshResult.access_token
      } catch (error) {
        console.error('Failed to refresh Google token:', error)
        return NextResponse.json({
          busyTimes: [],
          cached: false,
          requiresReconnect: true,
          message: 'Failed to refresh access token',
        })
      }
    }

    // Convert dates to ISO timestamps
    const timeMin = new Date(startDate).toISOString()
    const timeMax = new Date(`${endDate}T23:59:59.999Z`).toISOString()

    // Fetch calendar events
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📅 FETCHING GOOGLE CALENDAR EVENTS')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('User ID:', pattern.created_by)
      console.log('Date Range:', { startDate, endDate })
      console.log('Time Range (ISO):', { timeMin, timeMax })
      console.log('Pattern:', { id: pattern.id, title: pattern.title })
      console.log('')

      const events = await googleMeetService.getCalendarEvents(accessToken, timeMin, timeMax)

      console.log(`✅ Successfully fetched ${events.length} event(s) from Google Calendar`)
      console.log('')

      if (events.length > 0) {
        console.log('📋 CALENDAR EVENTS FOR THIS WEEK:')
        console.log('─────────────────────────────────────────────')
        events.forEach((event, index) => {
          const startDate = new Date(event.start)
          const endDate = new Date(event.end)
          const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60) // minutes

          console.log(`${index + 1}. ${event.summary || '(No title)'}`)
          console.log(`   Start: ${startDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`)
          console.log(`   End:   ${endDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`)
          console.log(`   Duration: ${duration} minutes`)
          console.log('')
        })
      } else {
        console.log('📭 No calendar events found for this week')
      }

      // Convert to busy times (privacy-focused - don't include event details)
      const busyTimes: CalendarBusyTime[] = events.map((event) => ({
        start: event.start,
        end: event.end,
        // Don't include summary for privacy (user chose "Just 'Busy'")
      }))

      console.log(`🔒 Converted to ${busyTimes.length} busy time slot(s) (privacy mode)`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')

      // Cache the results
      calendarCache.set(pattern.created_by, startDate, endDate, busyTimes)

      // Update last_used_at
      await supabase
        .from('oauth_connections')
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', pattern.created_by)
        .eq('provider', 'google')

      return NextResponse.json({
        busyTimes,
        cached: false,
      })
    } catch (error) {
      console.error('❌ Failed to fetch calendar events:', error)
      return NextResponse.json({
        busyTimes: [],
        cached: false,
        error: 'Failed to fetch calendar events',
      })
    }
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ CALENDAR EVENTS API ERROR')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
