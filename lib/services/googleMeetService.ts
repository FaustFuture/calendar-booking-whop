/**
 * Google Meet Service
 * Handles OAuth authentication and meeting creation via Google Calendar API
 */

import {
  MeetingDetails,
  MeetingResult,
  OAuthTokens,
  TokenRefreshResult,
  MeetingServiceError,
} from './types'

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export class GoogleMeetService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || ''

    // Google Meet configuration validated when used
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(
        'Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in your .env.local file.'
      )
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly', // For reading calendar events to check conflicts
      'https://www.googleapis.com/auth/userinfo.email',
    ]

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      state,
    })

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`
  }

  /**
   * Generate OAuth authorization URL with recording access
   * Note: This requires the 'drive.meet.readonly' restricted scope which needs verification
   * See: https://developers.google.com/meet/api/guides/recording
   */
  getAuthorizationUrlWithRecordings(state: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(
        'Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in your .env.local file.'
      )
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly', // For reading calendar events to check conflicts
      'https://www.googleapis.com/auth/userinfo.email',
      // Restricted scope - requires Google verification process
      // Use 'drive.readonly' as fallback if drive.meet.readonly is not verified yet
      'https://www.googleapis.com/auth/drive.meet.readonly',
      // Alternative: 'https://www.googleapis.com/auth/drive.readonly', // Broader access
    ]

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      state,
    })

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to exchange code for tokens: ${error.error_description || error.error}`,
          'google',
          error.error,
          error
        )
      }

      const tokens: OAuthTokens = await response.json()
      return tokens
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to exchange authorization code',
        'google',
        'EXCHANGE_ERROR',
        error
      )
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to refresh token: ${error.error_description || error.error}`,
          'google',
          error.error,
          error
        )
      }

      const result = await response.json()
      return {
        access_token: result.access_token,
        expires_in: result.expires_in,
        refresh_token: result.refresh_token, // Sometimes Google returns a new refresh token
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to refresh access token',
        'google',
        'REFRESH_ERROR',
        error
      )
    }
  }

  /**
   * Create a Google Meet meeting via Google Calendar API
   * Note: Google Meet meetings created this way are automatically open
   * - Anyone with the link can join without the host needing to start the meeting
   * - The meeting is accessible at the scheduled start time
   * 
   * Recording: Google Meet recording cannot be automatically enabled via Calendar API.
   * If enableRecording is true, a note will be added to the event description.
   * Recording must be enabled manually by the host during the meeting, or configured
   * via Google Workspace admin settings for automatic recording.
   */
  async createMeeting(
    accessToken: string,
    details: MeetingDetails
  ): Promise<MeetingResult> {
    try {
      // Build description with recording note if enabled
      let description = details.description || ''
      if (details.enableRecording !== false) {
        const recordingNote = '\n\n📹 Recording: Please enable recording when you start the meeting by clicking the "Record" button in the meeting controls.'
        description = description ? `${description}${recordingNote}` : recordingNote.trim()
      }

      // Format event for Google Calendar API
      // Google Meet meetings are automatically open - no additional settings needed
      // Use the user's timezone if provided, otherwise default to UTC
      const timezone = details.timezone || 'UTC'

      const event = {
        summary: details.title,
        description,
        start: {
          dateTime: details.startTime,
          timeZone: timezone,
        },
        end: {
          dateTime: details.endTime,
          timeZone: timezone,
        },
        attendees: details.attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      }

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      )

      const result = await response.json()
      console.log('response', result)

      if (!response.ok) {
        throw new MeetingServiceError(
          `Failed to create Google Meet: ${result.error?.message || 'Unknown error'}`,
          'google',
          result.error?.code?.toString(),
          result
        )
      }

      // Extract Google Meet link from conference data
      // const meetingUrl = result.conferenceData?.entryPoints?.find(
      //   (ep: { entryPointType: string }) => ep.entryPointType === 'video'
      // )?.uri

      const meetingUrl = result.hangoutLink

      console.log('meetingUrl', meetingUrl)

      if (!meetingUrl) {
        throw new MeetingServiceError(
          'Google Meet link not found in response',
          'google',
          'NO_MEETING_LINK'
        )
      }

      return {
        meetingUrl,
        meetingId: result.id,
        provider: 'google',
        rawResponse: result,
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      console.log('error', error)
      throw new MeetingServiceError(
        'Failed to create Google Meet meeting',
        'google',
        'CREATE_ERROR',
        error
      )
    }
  }

  /**
   * Create a Google Calendar event (for non-Google Meet meetings)
   * This creates a calendar event without necessarily creating a Google Meet conference
   */
  async createCalendarEvent(
    userId: string,
    details: MeetingDetails & { location?: string; conferenceData?: any }
  ): Promise<{ eventId: string; meetingUrl?: string }> {
    try {
      // Get access token from database
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const { data: connection } = await supabase
        .from('oauth_connections')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      if (!connection) {
        throw new Error('No Google OAuth connection found')
      }

      let accessToken = connection.access_token

      // Check if token needs refresh
      const expiresAt = new Date(connection.expires_at)
      if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000 && connection.refresh_token) {
        const refreshResult = await this.refreshAccessToken(connection.refresh_token)
        accessToken = refreshResult.access_token

        // Update token in database
        await supabase
          .from('oauth_connections')
          .update({
            access_token: refreshResult.access_token,
            expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
            refresh_token: refreshResult.refresh_token || connection.refresh_token,
          })
          .eq('user_id', userId)
          .eq('provider', 'google')
      }

      // Build event description
      let description = details.description || ''

      // Use the user's timezone if provided, otherwise default to UTC
      const timezone = details.timezone || 'UTC'

      // Build the event object
      const event: any = {
        summary: details.title,
        description,
        start: {
          dateTime: details.startTime,
          timeZone: timezone,
        },
        end: {
          dateTime: details.endTime,
          timeZone: timezone,
        },
        attendees: details.attendees.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      }

      // Add location if provided (for physical meetings)
      if (details.location) {
        event.location = details.location
      }

      // Add conference data if provided (for Google Meet meetings)
      // Pass conferenceData: null to explicitly NOT create a Meet link
      // Pass conferenceData: undefined or a valid object to create one
      if (details.conferenceData !== null && details.conferenceData !== undefined) {
        event.conferenceData = details.conferenceData
      } else if (details.conferenceData === undefined) {
        // Default behavior: don't create conference for calendar events
        // (only createMeeting should create Meet links)
      }

      // Determine API URL based on whether we need conference data
      const apiUrl = event.conferenceData
        ? `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`
        : `${GOOGLE_CALENDAR_API}/calendars/primary/events`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new MeetingServiceError(
          `Failed to create calendar event: ${result.error?.message || 'Unknown error'}`,
          'google',
          result.error?.code?.toString(),
          result
        )
      }

      console.log('📅 Calendar event created successfully:', result.id)

      // Extract Google Meet link if conference data was created
      const meetingUrl = result.hangoutLink || result.conferenceData?.entryPoints?.find(
        (ep: { entryPointType: string }) => ep.entryPointType === 'video'
      )?.uri

      return {
        eventId: result.id,
        meetingUrl,
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      console.error('Error creating calendar event:', error)
      throw new MeetingServiceError(
        'Failed to create calendar event',
        'google',
        'CREATE_ERROR',
        error
      )
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name: string
  }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new MeetingServiceError(
          'Failed to get user info from Google',
          'google',
          'USER_INFO_ERROR'
        )
      }

      const userInfo = await response.json()
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to fetch user info',
        'google',
        'USER_INFO_ERROR',
        error
      )
    }
  }

  /**
   * Revoke OAuth access
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new MeetingServiceError(
          'Failed to revoke Google OAuth access',
          'google',
          'REVOKE_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to revoke access',
        'google',
        'REVOKE_ERROR',
        error
      )
    }
  }

  /**
   * Fetch calendar events for conflict checking
   * Returns events from the user's primary calendar within the specified time range
   * Only returns non-cancelled events (status !== 'cancelled')
   * Transparent events (marked as free time) are excluded
   */
  async getCalendarEvents(
    accessToken: string,
    timeMin: string, // ISO timestamp
    timeMax: string // ISO timestamp
  ): Promise<Array<{
    id: string
    summary?: string
    start: string // ISO timestamp
    end: string // ISO timestamp
  }>> {
    try {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true', // Expand recurring events
        orderBy: 'startTime',
        maxResults: '250', // Get up to 250 events
      })

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to fetch calendar events: ${error.error?.message || 'Unknown error'}`,
          'google',
          error.error?.code?.toString(),
          error
        )
      }

      const result = await response.json()
      const events = result.items || []

      // Filter and transform events
      return events
        .filter((event: any) => {
          // Exclude cancelled events
          if (event.status === 'cancelled') return false

          // Exclude transparent events (free time)
          if (event.transparency === 'transparent') return false

          // Must have start and end times
          if (!event.start || !event.end) return false

          return true
        })
        .map((event: any) => ({
          id: event.id,
          summary: event.summary,
          // Handle both dateTime (timed events) and date (all-day events)
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
        }))
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to fetch calendar events',
        'google',
        'FETCH_EVENTS_ERROR',
        error
      )
    }
  }

  /**
   * Delete a Google Calendar event
   * Used when bookings are cancelled or deleted
   */
  async deleteCalendarEvent(
    accessToken: string,
    eventId: string
  ): Promise<void> {
    try {
      console.log('🗑️ Deleting Google Calendar event:', eventId)

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        // 404 is acceptable - event might already be deleted
        if (response.status === 404) {
          console.log('⚠️ Calendar event not found (may already be deleted):', eventId)
          return
        }

        // 410 Gone is also acceptable - event was already deleted
        if (response.status === 410) {
          console.log('⚠️ Calendar event already deleted:', eventId)
          return
        }

        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to delete calendar event: ${error.error?.message || 'Unknown error'}`,
          'google',
          error.error?.code?.toString(),
          error
        )
      }

      console.log('✅ Google Calendar event deleted successfully:', eventId)
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to delete calendar event',
        'google',
        'DELETE_EVENT_ERROR',
        error
      )
    }
  }

  /**
   * Update a Google Calendar event (for rescheduling)
   * Used when admins change meeting times
   */
  async updateCalendarEvent(
    accessToken: string,
    eventId: string,
    updates: {
      startTime?: string // ISO timestamp
      endTime?: string // ISO timestamp
      title?: string
      description?: string
      timezone?: string // IANA timezone identifier
    }
  ): Promise<void> {
    try {
      console.log('📝 Updating Google Calendar event:', eventId)
      console.log('Updates:', updates)

      // First, get the existing event
      const getResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!getResponse.ok) {
        const error = await getResponse.json()
        throw new MeetingServiceError(
          `Failed to fetch calendar event: ${error.error?.message || 'Unknown error'}`,
          'google',
          error.error?.code?.toString(),
          error
        )
      }

      const existingEvent = await getResponse.json()

      // Prepare updated event data
      const updatedEvent: any = {
        ...existingEvent,
      }

      if (updates.title) {
        updatedEvent.summary = updates.title
      }

      if (updates.description) {
        updatedEvent.description = updates.description
      }

      if (updates.startTime) {
        updatedEvent.start = {
          dateTime: updates.startTime,
          timeZone: updates.timezone || existingEvent.start.timeZone || 'UTC',
        }
      }

      if (updates.endTime) {
        updatedEvent.end = {
          dateTime: updates.endTime,
          timeZone: updates.timezone || existingEvent.end.timeZone || 'UTC',
        }
      }

      // Update the event
      const updateResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedEvent),
        }
      )

      if (!updateResponse.ok) {
        const error = await updateResponse.json()
        throw new MeetingServiceError(
          `Failed to update calendar event: ${error.error?.message || 'Unknown error'}`,
          'google',
          error.error?.code?.toString(),
          error
        )
      }

      console.log('✅ Google Calendar event updated successfully')
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to update calendar event',
        'google',
        'UPDATE_EVENT_ERROR',
        error
      )
    }
  }
}

// Export singleton instance
export const googleMeetService = new GoogleMeetService()
