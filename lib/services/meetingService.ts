/**
 * Meeting Service Facade
 * Unified interface for Zoom meeting creation
 * Handles OAuth token management and database integration
 */

import { createClient } from '@/lib/supabase/server'
import { OAuthProvider } from '@/lib/types/database'
import { zoomService } from './zoomService'
import { googleMeetService } from './googleMeetService'
import { MeetingDetails, MeetingResult, MeetingServiceError, TokenRefreshResult } from './types'

export class MeetingService {
  /**
   * Get OAuth connection for a user and provider
   */
  private async getOAuthConnection(userId: string, provider: OAuthProvider) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      throw new MeetingServiceError(
        `No active ${provider} connection found for user`,
        provider,
        'NO_CONNECTION'
      )
    }

    return data
  }

  /**
   * Update OAuth connection in database
   */
  private async updateOAuthConnection(
    connectionId: string,
    updates: {
      access_token?: string
      refresh_token?: string
      expires_at?: string
      last_used_at?: string
    }
  ) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('oauth_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (error) {
      // Failed to update OAuth connection
    }
  }

  /**
   * Check if access token needs refresh and refresh if necessary
   */
  private async ensureValidToken(
    connection: {
      id: string
      provider: OAuthProvider
      access_token: string
      refresh_token?: string
      expires_at: string
    }
  ): Promise<string> {
    const expiresAt = new Date(connection.expires_at)
    const now = new Date()

    // Refresh if token expires in less than 5 minutes
    const shouldRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000

    if (!shouldRefresh) {
      return connection.access_token
    }

    // Token needs refresh
    if (!connection.refresh_token) {
      throw new MeetingServiceError(
        'Token expired and no refresh token available',
        connection.provider,
        'NO_REFRESH_TOKEN'
      )
    }

    try {
      let refreshResult

      // Refresh token based on provider
      if (connection.provider === 'zoom') {
        refreshResult = await zoomService.refreshAccessToken(connection.refresh_token)
      } else if (connection.provider === 'google') {
        refreshResult = await this.refreshGoogleToken(connection.refresh_token)
      } else {
        throw new MeetingServiceError(
          'Unsupported provider for token refresh',
          connection.provider,
          'UNSUPPORTED_PROVIDER'
        )
      }

      // Update database with new tokens
      const newExpiresAt = new Date(
        Date.now() + refreshResult.expires_in * 1000
      ).toISOString()

      await this.updateOAuthConnection(connection.id, {
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token || connection.refresh_token,
        expires_at: newExpiresAt,
        last_used_at: new Date().toISOString(),
      })

      return refreshResult.access_token
    } catch (error) {
      throw new MeetingServiceError(
        'Failed to refresh access token',
        connection.provider,
        'REFRESH_FAILED',
        error
      )
    }
  }

  /**
   * Refresh Google OAuth token
   */
  private async refreshGoogleToken(refreshToken: string): Promise<TokenRefreshResult> {
    return await googleMeetService.refreshAccessToken(refreshToken)
  }

  /**
   * Generate meeting link for a booking
   */
  async generateMeetingLink(
    userId: string,
    provider: OAuthProvider,
    details: MeetingDetails
  ): Promise<MeetingResult> {
    try {
      let accessToken: string
      let result: MeetingResult

      if (provider === 'zoom') {
        // Server-to-Server OAuth: Generate token on-demand (no user connection needed)
        const tokens = await zoomService.generateAccessToken()
        accessToken = tokens.access_token
        result = await zoomService.createMeeting(accessToken, details)
      } else if (provider === 'google') {
        // User OAuth: Get connection from database and ensure valid token
        const connection = await this.getOAuthConnection(userId, provider)
        accessToken = await this.ensureValidToken(connection)
        
        // Update last used timestamp
        await this.updateOAuthConnection(connection.id, {
          last_used_at: new Date().toISOString(),
        })

        result = await googleMeetService.createMeeting(accessToken, details)
      } else {
        throw new MeetingServiceError(
          `Unsupported provider: ${provider}`,
          provider,
          'UNSUPPORTED_PROVIDER'
        )
      }

      return result
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error

      throw new MeetingServiceError(
        'Failed to generate meeting link',
        provider,
        'GENERATION_FAILED',
        error
      )
    }
  }

  /**
   * Check if user has active OAuth connection for a provider
   */
  async hasActiveConnection(
    userId: string,
    provider: OAuthProvider
  ): Promise<boolean> {
    try {
      // Zoom uses Server-to-Server OAuth - always available if configured
      if (provider === 'zoom') {
        const accountId = process.env.ZOOM_ACCOUNT_ID
        const clientId = process.env.ZOOM_CLIENT_ID || process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID
        const clientSecret = process.env.ZOOM_CLIENT_SECRET
        return !!(accountId && clientId && clientSecret)
      }

      // Google Meet uses user OAuth connections - check database
      if (provider === 'google') {
        const supabase = await createClient()
        const { data } = await supabase
          .from('oauth_connections')
          .select('id')
          .eq('user_id', userId)
          .eq('provider', 'google')
          .eq('is_active', true)
          .single()
        return !!data
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Get all active OAuth connections for a user
   */
  async getUserConnections(userId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('oauth_connections')
      .select('id, provider, provider_email, is_active, created_at, last_used_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      return []
    }

    return data || []
  }

  /**
   * Disconnect OAuth provider
   */
  async disconnectProvider(userId: string, provider: OAuthProvider): Promise<void> {
    try {
      const connection = await this.getOAuthConnection(userId, provider)

      // Revoke access with provider
      if (provider === 'zoom') {
        await zoomService.revokeAccess(connection.access_token)
      } else if (provider === 'google') {
        await googleMeetService.revokeAccess(connection.access_token)
      }

      // Mark connection as inactive
      await this.updateOAuthConnection(connection.id, {
        last_used_at: new Date().toISOString(),
      })

      const supabase = await createClient()
      await supabase
        .from('oauth_connections')
        .update({ is_active: false })
        .eq('id', connection.id)
    } catch (error) {
      throw new MeetingServiceError(
        'Failed to disconnect provider',
        provider,
        'DISCONNECT_FAILED',
        error
      )
    }
  }

  /**
   * Delete a Google Calendar event
   * Used when bookings are cancelled or deleted
   */
  async deleteGoogleCalendarEvent(
    userId: string,
    eventId: string
  ): Promise<void> {
    try {
      // Get connection and ensure valid token
      const connection = await this.getOAuthConnection(userId, 'google')
      const accessToken = await this.ensureValidToken(connection)

      // Delete the calendar event
      await googleMeetService.deleteCalendarEvent(accessToken, eventId)

      // Update last used timestamp
      await this.updateOAuthConnection(connection.id, {
        last_used_at: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error

      throw new MeetingServiceError(
        'Failed to delete Google Calendar event',
        'google',
        'DELETE_FAILED',
        error
      )
    }
  }

  /**
   * Update a Google Calendar event (for rescheduling)
   * Used when admins change meeting times
   */
  async updateGoogleCalendarEvent(
    userId: string,
    eventId: string,
    updates: {
      startTime?: string
      endTime?: string
      title?: string
      description?: string
      timezone?: string
    }
  ): Promise<void> {
    try {
      // Get connection and ensure valid token
      const connection = await this.getOAuthConnection(userId, 'google')
      const accessToken = await this.ensureValidToken(connection)

      // Update the calendar event
      await googleMeetService.updateCalendarEvent(accessToken, eventId, updates)

      // Update last used timestamp
      await this.updateOAuthConnection(connection.id, {
        last_used_at: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof MeetingServiceError) throw error

      throw new MeetingServiceError(
        'Failed to update Google Calendar event',
        'google',
        'UPDATE_FAILED',
        error
      )
    }
  }
}

// Export singleton instance
export const meetingService = new MeetingService()
