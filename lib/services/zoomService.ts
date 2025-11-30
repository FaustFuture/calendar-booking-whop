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

const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token'
const ZOOM_API_BASE = 'https://api.zoom.us/v2'

export class ZoomService {
  private accountId: string
  private clientId: string
  private clientSecret: string

  constructor() {
    // Server-to-Server OAuth requires Account ID, Client ID, and Client Secret
    this.accountId = process.env.ZOOM_ACCOUNT_ID || ''
    this.clientId = process.env.ZOOM_CLIENT_ID || process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID || ''
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || ''

    // Zoom Server-to-Server OAuth configuration validated in generateAccessToken()
  }

  /**
   * Generate Server-to-Server OAuth access token
   * This doesn't require user interaction - uses account credentials directly
   */
  async generateAccessToken(): Promise<OAuthTokens> {
    // Validate configuration with detailed error messages
    const missingVars: string[] = []
    if (!this.accountId) missingVars.push('ZOOM_ACCOUNT_ID')
    if (!this.clientId) missingVars.push('ZOOM_CLIENT_ID')
    if (!this.clientSecret) missingVars.push('ZOOM_CLIENT_SECRET')

    if (missingVars.length > 0) {
      throw new Error(
        `Zoom Server-to-Server OAuth is not configured. Missing environment variables: ${missingVars.join(', ')}. ` +
        `Please set these in your Vercel project settings or environment configuration.`
      )
    }

    // Validate that values are not just whitespace
    if (this.accountId.trim() === '' || this.clientId.trim() === '' || this.clientSecret.trim() === '') {
      throw new Error(
        'Zoom Server-to-Server OAuth environment variables are set but empty. ' +
        'Please check ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in your environment configuration.'
      )
    }

    try {
      // Server-to-Server OAuth uses account credentials to get tokens
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

      const response = await fetch(ZOOM_TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }),
      })

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: response.statusText, status: response.status }
        }

        // Provide specific guidance based on error
        let errorMessage = errorData.reason || errorData.error || response.statusText
        if (errorData.error === 'invalid_client' || errorMessage.includes('Invalid client')) {
          errorMessage += '. Please verify that ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are correct in your Zoom app settings and match your environment variables.'
        } else if (errorData.error === 'invalid_grant' || errorMessage.includes('account')) {
          errorMessage += '. Please verify that ZOOM_ACCOUNT_ID is correct and matches your Zoom account.'
        }

        throw new MeetingServiceError(
          `Failed to generate Server-to-Server token: ${errorMessage}`,
          'zoom',
          errorData.error || 'TOKEN_ERROR',
          errorData
        )
      }

      const tokens: OAuthTokens = await response.json()
      
      return tokens
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error
      throw new MeetingServiceError(
        'Failed to generate Server-to-Server access token',
        'zoom',
        'TOKEN_GENERATION_ERROR',
        error
      )
    }
  }

  /**
   * Exchange authorization code for access tokens (DEPRECATED - Server-to-Server doesn't use this)
   * Kept for backward compatibility but not used with Server-to-Server OAuth
   * Note: This method is deprecated and will throw an error
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    throw new Error(
      'User OAuth is deprecated. Zoom now uses Server-to-Server OAuth. Use generateAccessToken() instead.'
    )
    
    // Old implementation removed - Server-to-Server doesn't use authorization codes
    /*
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

      */
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
          join_before_host: true, // Allow participants to join before host
          jbh_time: 0, // Allow join before host at any time (0 = no restriction)
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both', // Both telephony and VoIP
          auto_recording: details.enableRecording !== false ? 'cloud' : 'none', // Auto-record to cloud (enabled by default)
          waiting_room: false, // Disable waiting room so participants can join directly
          meeting_authentication: false,
          // Enable recording without host present
          // NOTE: This requires "Allow cloud recording without host" to be enabled in Zoom account settings
          // Go to: Zoom Admin Dashboard > Account Management > Account Settings > Recording > Cloud Recording
          // Enable: "Allow cloud recording without host"
          recording_authentication_option: false, // Disable recording authentication
          allow_multiple_devices: true, // Allow participants to join from multiple devices
          // Alternative: Enable local recording as well (participants can record locally)
          local_recording: true, // Allow local recording by participants
        },
      }

      const apiUrl = `${ZOOM_API_BASE}/users/me/meetings`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingRequest),
      })


      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          // If response isn't JSON, use status text
          errorData = { message: response.statusText, status: response.status }
        }

        throw new MeetingServiceError(
          `Failed to create Zoom meeting: ${errorData.message || errorData.reason || 'Unknown error'} (Status: ${response.status})`,
          'zoom',
          errorData.code?.toString() || errorData.error || response.status.toString(),
          errorData
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
      const apiUrl = `${ZOOM_API_BASE}/users/me`

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new MeetingServiceError(
          `Failed to get user info from Zoom: ${errorBody.message || response.statusText}`,
          'zoom',
          'USER_INFO_ERROR',
          errorBody
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
