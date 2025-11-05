/**
 * Meeting Service Facade
 * Unified interface for Google Meet and Zoom meeting creation
 * Handles OAuth token management and database integration
 */

import { createClient } from '@/lib/supabase/server'
import { OAuthProvider } from '@/lib/types/database'
import { googleMeetService } from './googleMeetService'
import { zoomService } from './zoomService'
import { MeetingDetails, MeetingResult, MeetingServiceError } from './types'

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
      console.error('Failed to update OAuth connection:', error)
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

      if (connection.provider === 'google') {
        refreshResult = await googleMeetService.refreshAccessToken(
          connection.refresh_token
        )
      } else {
        refreshResult = await zoomService.refreshAccessToken(connection.refresh_token)
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
   * Generate meeting link for a booking
   */
  async generateMeetingLink(
    userId: string,
    provider: OAuthProvider,
    details: MeetingDetails
  ): Promise<MeetingResult> {
    try {
      // Get OAuth connection
      const connection = await this.getOAuthConnection(userId, provider)

      // Ensure token is valid
      const accessToken = await this.ensureValidToken(connection)

      // Update last used timestamp
      await this.updateOAuthConnection(connection.id, {
        last_used_at: new Date().toISOString(),
      })

      // Create meeting using appropriate service
      let result: MeetingResult

      if (provider === 'google') {
        result = await googleMeetService.createMeeting(accessToken, details)
      } else if (provider === 'zoom') {
        result = await zoomService.createMeeting(accessToken, details)
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
      const supabase = await createClient()

      const { data } = await supabase
        .from('oauth_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single()

      return !!data
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
      console.error('Failed to fetch user connections:', error)
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
      if (provider === 'google') {
        await googleMeetService.revokeAccess(connection.access_token)
      } else if (provider === 'zoom') {
        await zoomService.revokeAccess(connection.access_token)
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
}

// Export singleton instance
export const meetingService = new MeetingService()
