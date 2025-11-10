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

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('Google Meet configuration incomplete. Check environment variables.')
    }
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
   */
  async createMeeting(
    accessToken: string,
    details: MeetingDetails
  ): Promise<MeetingResult> {
    try {
      // Format event for Google Calendar API
      // Google Meet meetings are automatically open - no additional settings needed
      const event = {
        summary: details.title,
        description: details.description || '',
        start: {
          dateTime: details.startTime,
          timeZone: details.timezone || 'UTC',
        },
        end: {
          dateTime: details.endTime,
          timeZone: details.timezone || 'UTC',
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

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to create Google Meet: ${error.error?.message || 'Unknown error'}`,
          'google',
          error.error?.code?.toString(),
          error
        )
      }

      const result = await response.json()

      // Extract Google Meet link from conference data
      const meetingUrl = result.conferenceData?.entryPoints?.find(
        (ep: { entryPointType: string }) => ep.entryPointType === 'video'
      )?.uri

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
      throw new MeetingServiceError(
        'Failed to create Google Meet meeting',
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
}

// Export singleton instance
export const googleMeetService = new GoogleMeetService()
