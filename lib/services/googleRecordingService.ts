import { createClient } from '@/lib/supabase/server'
import type { Recording } from '@/lib/types/database'

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  createdTime: string
  modifiedTime: string
  webViewLink: string
  webContentLink: string
  thumbnailLink?: string
  videoMediaMetadata?: {
    width: number
    height: number
    durationMillis: string
  }
}

interface GoogleAccessTokenData {
  access_token: string
  refresh_token?: string
  expires_at: string
}

/**
 * Service for managing Google Meet recordings
 * Note: Requires 'drive.meet.readonly' or 'drive.readonly' OAuth scope
 */
export class GoogleRecordingService {
  private readonly driveApiUrl = 'https://www.googleapis.com/drive/v3'

  /**
   * Get Google OAuth connection and refresh token if needed
   */
  private async getGoogleConnection(userId: string): Promise<GoogleAccessTokenData | null> {
    const supabase = await createClient()

    const { data: connection } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    if (!connection) {
      return null
    }

    // Check if token needs refresh (within 5 minutes of expiration)
    const expiresAt = new Date(connection.expires_at)
    const now = new Date()
    const fiveMinutes = 5 * 60 * 1000

    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      // Refresh the token
      return await this.refreshGoogleToken(connection.id, connection.refresh_token)
    }

    return {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expires_at: connection.expires_at,
    }
  }

  /**
   * Refresh Google access token
   */
  private async refreshGoogleToken(connectionId: string, refreshToken: string): Promise<GoogleAccessTokenData> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token'

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Google token: ${response.statusText}`)
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    // Update connection in database
    const supabase = await createClient()
    await supabase
      .from('oauth_connections')
      .update({
        access_token: data.access_token,
        expires_at: expiresAt,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Google doesn't return new refresh token
      expires_at: expiresAt,
    }
  }

  /**
   * Search for recordings in Google Drive by meeting code/ID
   * Google Meet recordings are stored in the "Meet Recordings" folder in Drive
   */
  async searchMeetingRecordings(meetingCode: string, userId: string): Promise<GoogleDriveFile[]> {
    const connection = await this.getGoogleConnection(userId)

    if (!connection) {
      throw new Error('No active Google connection found')
    }

    // Search for video files in "Meet Recordings" folder that contain the meeting code
    const query = `name contains '${meetingCode}' and mimeType contains 'video/' and trashed=false`

    const params = new URLSearchParams({
      q: query,
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,videoMediaMetadata)',
      orderBy: 'createdTime desc',
      pageSize: '10',
    })

    const response = await fetch(
      `${this.driveApiUrl}/files?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google Drive API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.files || []
  }

  /**
   * Get recording file details by ID
   */
  async getRecordingDetails(fileId: string, userId: string): Promise<GoogleDriveFile | null> {
    const connection = await this.getGoogleConnection(userId)

    if (!connection) {
      throw new Error('No active Google connection found')
    }

    const params = new URLSearchParams({
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,videoMediaMetadata',
    })

    const response = await fetch(
      `${this.driveApiUrl}/files/${fileId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Accept': 'application/json',
        },
      }
    )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google Drive API error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Save Google recording to database
   */
  async saveRecordingToDatabase(
    driveFile: GoogleDriveFile,
    bookingId: string,
    meetingCode?: string,
    companyId?: string
  ): Promise<Recording> {
    const supabase = await createClient()

    // Parse duration from milliseconds to seconds
    const duration = driveFile.videoMediaMetadata?.durationMillis
      ? Math.floor(parseInt(driveFile.videoMediaMetadata.durationMillis) / 1000)
      : undefined

    // Parse file size
    const fileSize = driveFile.size ? parseInt(driveFile.size) : undefined

    const recordingData = {
      booking_id: bookingId,
      company_id: companyId, // Store company_id for multi-tenant isolation
      provider: 'google' as const,
      external_id: driveFile.id,
      meeting_provider_id: meetingCode,
      url: driveFile.webViewLink,
      playback_url: driveFile.webViewLink, // Google Drive view link
      download_url: driveFile.webContentLink, // Direct download link
      title: driveFile.name,
      duration,
      file_size: fileSize,
      status: 'available' as const,
      recording_type: 'cloud' as const,
      auto_fetched: true,
      fetched_at: new Date().toISOString(),
      metadata: {
        mime_type: driveFile.mimeType,
        created_time: driveFile.createdTime,
        modified_time: driveFile.modifiedTime,
        thumbnail_link: driveFile.thumbnailLink,
        video_metadata: driveFile.videoMediaMetadata,
      },
    }

    // Check if recording already exists
    const { data: existing } = await supabase
      .from('recordings')
      .select('id')
      .eq('provider', 'google')
      .eq('external_id', driveFile.id)
      .single()

    if (existing) {
      // Update existing recording
      const { data: updated } = await supabase
        .from('recordings')
        .update({
          ...recordingData,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      return updated!
    } else {
      // Insert new recording
      const { data: inserted } = await supabase
        .from('recordings')
        .insert(recordingData)
        .select()
        .single()

      return inserted!
    }
  }

  /**
   * Fetch and save recordings for a booking by meeting code
   */
  async fetchAndSaveRecordings(bookingId: string, meetingCode: string, userId: string, companyId?: string): Promise<Recording[]> {
    const driveFiles = await this.searchMeetingRecordings(meetingCode, userId)

    if (driveFiles.length === 0) {
      return []
    }

    const savedRecordings: Recording[] = []

    for (const file of driveFiles) {
      const recording = await this.saveRecordingToDatabase(file, bookingId, meetingCode, companyId)
      savedRecordings.push(recording)
    }

    return savedRecordings
  }

  /**
   * Extract meeting code from Google Meet URL
   * Example: https://meet.google.com/abc-defg-hij -> abc-defg-hij
   */
  extractMeetingCode(meetingUrl: string): string | null {
    try {
      const url = new URL(meetingUrl)
      if (url.hostname === 'meet.google.com') {
        const path = url.pathname.split('/').filter(Boolean)
        return path[0] || null
      }
      return null
    } catch {
      return null
    }
  }
}

export const googleRecordingService = new GoogleRecordingService()
