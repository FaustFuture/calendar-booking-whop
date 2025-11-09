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

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      console.warn('Zoom Server-to-Server OAuth configuration incomplete. Check environment variables.')
      console.warn('Required: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET')
    }
  }

  /**
   * Generate Server-to-Server OAuth access token
   * This doesn't require user interaction - uses account credentials directly
   */
  async generateAccessToken(): Promise<OAuthTokens> {
    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error(
        'Zoom Server-to-Server OAuth is not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in your environment variables.'
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
        const error = await response.json()
        throw new MeetingServiceError(
          `Failed to generate Server-to-Server token: ${error.reason || error.error || response.statusText}`,
          'zoom',
          error.error || 'TOKEN_ERROR',
          error
        )
      }

      const tokens: OAuthTokens = await response.json()
      
      console.log('Zoom Server-to-Server token generated:', {
        hasAccessToken: !!tokens.access_token,
        expiresIn: tokens.expires_in,
        scopes: tokens.scope,
      })
      
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
    console.log('createMeeting', accessToken, details)
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

      const apiUrl = `${ZOOM_API_BASE}/users/me/meetings`
      console.log('Zoom API call - createMeeting:', {
        url: apiUrl,
        method: 'POST',
        hasAccessToken: !!accessToken,
        meetingTitle: details.title,
      })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingRequest),
      })

      console.log('Zoom API response - createMeeting:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
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
      const apiUrl = `${ZOOM_API_BASE}/users/me`
      console.log('Zoom API call - getUserInfo:', {
        url: apiUrl,
        method: 'GET',
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length,
      })

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Zoom API response - getUserInfo:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        console.error('Zoom getUserInfo error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorBody,
        })
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
