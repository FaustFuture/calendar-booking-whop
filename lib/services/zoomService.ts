/**
 * Zoom Service
 * Handles OAuth authentication and meeting creation via Zoom API
 */

import {
  MeetingDetails,
  MeetingResult,
  OAuthTokens,
  TokenRefreshResult,
  MeetingServiceError,
} from './types'

const ZOOM_OAUTH_URL = 'https://zoom.us/oauth/authorize'
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token'
const ZOOM_API_BASE = 'https://api.zoom.us/v2'

export class ZoomService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID || ''
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || ''
    this.redirectUri = process.env.ZOOM_REDIRECT_URI || ''

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('Zoom configuration incomplete. Check environment variables.')
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(
        'Zoom OAuth is not configured. Please set NEXT_PUBLIC_ZOOM_CLIENT_ID and ZOOM_REDIRECT_URI in your .env.local file.'
      )
    }

    // Zoom requires explicit scopes to be requested
    // Note: Zoom uses the format resource:action:subresource
    const scopes = [
      'meeting:write:meeting',  // Create a meeting for a user
      'user:read:user',         // View a user
    ]

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '), // Zoom expects space-separated scopes
      state,
    })

    return `${ZOOM_OAUTH_URL}?${params.toString()}`
  }

  /**
   * Generate OAuth authorization URL with recording scope
   */
  getAuthorizationUrlWithRecordings(state: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(
        'Zoom OAuth is not configured. Please set NEXT_PUBLIC_ZOOM_CLIENT_ID and ZOOM_REDIRECT_URI in your .env.local file.'
      )
    }

    // Request recording scope for accessing cloud recordings
    // Note: Zoom uses the format resource:action:subresource
    const scopes = [
      'meeting:write:meeting',           // Create a meeting for a user
      'user:read:user',                  // View a user
      'cloud_recording:read:recording',  // View a recording
    ]

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '), // Zoom expects space-separated scopes
      state,
    })

    return `${ZOOM_OAUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      // Zoom requires Basic Auth with client_id:client_secret
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
        'base64'
      )

      const response = await fetch(ZOOM_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to exchange code for tokens: ${error.reason || error.error}`,
          'zoom',
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
        'zoom',
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
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
        'base64'
      )

      const response = await fetch(ZOOM_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to refresh token: ${error.reason || error.error}`,
          'zoom',
          error.error,
          error
        )
      }

      const result = await response.json()
      return {
        access_token: result.access_token,
        expires_in: result.expires_in,
        refresh_token: result.refresh_token,
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to refresh access token',
        'zoom',
        'REFRESH_ERROR',
        error
      )
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(
    accessToken: string,
    details: MeetingDetails
  ): Promise<MeetingResult> {
    try {
      // Parse start time to create Zoom-compatible format
      const startTime = new Date(details.startTime)
      const endTime = new Date(details.endTime)
      const durationMinutes = Math.ceil(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      )

      // Format meeting request for Zoom API
      const meetingRequest = {
        topic: details.title,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration: durationMinutes,
        timezone: details.timezone || 'UTC',
        agenda: details.description || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both', // Both telephony and VoIP
          auto_recording: details.enableRecording ? 'cloud' : 'none', // Auto-record to cloud if enabled
          waiting_room: true,
          meeting_authentication: false,
        },
      }

      const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingRequest),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to create Zoom meeting: ${error.message || 'Unknown error'}`,
          'zoom',
          error.code?.toString(),
          error
        )
      }

      const result = await response.json()

      return {
        meetingUrl: result.join_url,
        meetingId: result.id.toString(),
        provider: 'zoom',
        hostUrl: result.start_url, // URL for host to start meeting
        password: result.password,
        rawResponse: result,
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to create Zoom meeting',
        'zoom',
        'CREATE_ERROR',
        error
      )
    }
  }

  /**
   * Get user info from Zoom
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name: string
  }> {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new MeetingServiceError(
          'Failed to get user info from Zoom',
          'zoom',
          'USER_INFO_ERROR'
        )
      }

      const userInfo = await response.json()
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: `${userInfo.first_name} ${userInfo.last_name}`.trim(),
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to fetch user info',
        'zoom',
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
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
        'base64'
      )

      const response = await fetch(`${ZOOM_API_BASE}/users/me/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          token: accessToken,
        }),
      })

      if (!response.ok) {
        throw new MeetingServiceError(
          'Failed to revoke Zoom OAuth access',
          'zoom',
          'REVOKE_ERROR'
        )
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to revoke access',
        'zoom',
        'REVOKE_ERROR',
        error
      )
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(accessToken: string, meetingId: string): Promise<void> {
    try {
      const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok && response.status !== 204) {
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to delete Zoom meeting: ${error.message || 'Unknown error'}`,
          'zoom',
          error.code?.toString(),
          error
        )
      }
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to delete Zoom meeting',
        'zoom',
        'DELETE_ERROR',
        error
      )
    }
  }
}

// Export singleton instance
export const zoomService = new ZoomService()
