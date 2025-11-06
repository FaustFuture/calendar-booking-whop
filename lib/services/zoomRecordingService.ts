import { createClient } from '@/lib/supabase/server'
import type { Recording } from '@/lib/types/database'

export interface ZoomRecording {
  id: string // Recording file ID
  meeting_id: string
  recording_start: string
  recording_end: string
  file_type: string // 'MP4', 'M4A', 'TIMELINE', 'TRANSCRIPT', 'CHAT'
  file_size: number
  play_url: string
  download_url: string
  status: string
  recording_type: string // 'shared_screen_with_speaker_view', 'audio_only', etc.
}

export interface ZoomRecordingResponse {
  id: string // Meeting UUID
  uuid: string
  host_id: string
  topic: string
  start_time: string
  duration: number
  total_size: number
  recording_count: number
  recording_files: ZoomRecording[]
}

interface ZoomAccessTokenData {
  access_token: string
  refresh_token?: string
  expires_at: string
}

/**
 * Service for managing Zoom cloud recordings
 */
export class ZoomRecordingService {
  private readonly baseUrl = 'https://api.zoom.us/v2'

  /**
   * Get Zoom OAuth connection and refresh token if needed
   */
  private async getZoomConnection(userId: string): Promise<ZoomAccessTokenData | null> {
    const supabase = await createClient()

    const { data: connection } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'zoom')
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
      return await this.refreshZoomToken(connection.id, connection.refresh_token)
    }

    return {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expires_at: connection.expires_at,
    }
  }

  /**
   * Refresh Zoom access token
   */
  private async refreshZoomToken(connectionId: string, refreshToken: string): Promise<ZoomAccessTokenData> {
    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Zoom OAuth credentials not configured')
    }

    const tokenUrl = 'https://zoom.us/oauth/token'
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const response = await fetch(`${tokenUrl}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Zoom token: ${response.statusText}`)
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    // Update connection in database
    const supabase = await createClient()
    await supabase
      .from('oauth_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: expiresAt,
    }
  }

  /**
   * Fetch recordings for a specific Zoom meeting
   */
  async fetchMeetingRecordings(meetingId: string, userId: string): Promise<ZoomRecordingResponse | null> {
    const connection = await this.getZoomConnection(userId)

    if (!connection) {
      throw new Error('No active Zoom connection found')
    }

    const response = await fetch(
      `${this.baseUrl}/meetings/${meetingId}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.status === 404) {
      // No recordings found for this meeting
      return null
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Zoom API error: ${error.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Save Zoom recording to database
   */
  async saveRecordingToDatabase(
    zoomRecording: ZoomRecordingResponse,
    bookingId: string
  ): Promise<Recording[]> {
    const supabase = await createClient()
    const savedRecordings: Recording[] = []

    // Filter only video and audio files (exclude chat, transcript files for now)
    const mediaFiles = zoomRecording.recording_files.filter(
      file => file.file_type === 'MP4' || file.file_type === 'M4A'
    )

    for (const file of mediaFiles) {
      // Calculate download expiration (Zoom tokens last 24 hours)
      const downloadExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // Find transcript file if available
      const transcriptFile = zoomRecording.recording_files.find(
        f => f.file_type === 'TRANSCRIPT' && f.recording_start === file.recording_start
      )

      const recordingData = {
        booking_id: bookingId,
        provider: 'zoom' as const,
        external_id: file.id,
        meeting_provider_id: zoomRecording.id,
        url: file.play_url,
        playback_url: file.play_url,
        download_url: file.download_url,
        download_expires_at: downloadExpiresAt,
        title: `${zoomRecording.topic} - ${file.file_type}`,
        duration: zoomRecording.duration * 60, // Convert minutes to seconds
        file_size: file.file_size,
        transcript_url: transcriptFile?.download_url,
        status: file.status === 'completed' ? 'available' as const : 'processing' as const,
        recording_type: 'cloud' as const,
        auto_fetched: true,
        fetched_at: new Date().toISOString(),
        metadata: {
          file_type: file.file_type,
          recording_type: file.recording_type,
          recording_start: file.recording_start,
          recording_end: file.recording_end,
          host_id: zoomRecording.host_id,
          uuid: zoomRecording.uuid,
        },
      }

      // Check if recording already exists
      const { data: existing } = await supabase
        .from('recordings')
        .select('id')
        .eq('provider', 'zoom')
        .eq('external_id', file.id)
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

        if (updated) {
          savedRecordings.push(updated)
        }
      } else {
        // Insert new recording
        const { data: inserted } = await supabase
          .from('recordings')
          .insert(recordingData)
          .select()
          .single()

        if (inserted) {
          savedRecordings.push(inserted)
        }
      }
    }

    return savedRecordings
  }

  /**
   * Refresh download URL for a Zoom recording (they expire after 24 hours)
   */
  async refreshDownloadUrl(recordingId: string, userId: string): Promise<string> {
    const supabase = await createClient()

    // Get recording details
    const { data: recording } = await supabase
      .from('recordings')
      .select('meeting_provider_id, external_id')
      .eq('id', recordingId)
      .eq('provider', 'zoom')
      .single()

    if (!recording || !recording.meeting_provider_id) {
      throw new Error('Recording not found or missing meeting ID')
    }

    // Fetch fresh recording data from Zoom
    const zoomData = await this.fetchMeetingRecordings(recording.meeting_provider_id, userId)

    if (!zoomData) {
      throw new Error('Recording not found on Zoom')
    }

    // Find the specific file
    const file = zoomData.recording_files.find(f => f.id === recording.external_id)

    if (!file) {
      throw new Error('Recording file not found')
    }

    // Update download URL in database
    const downloadExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await supabase
      .from('recordings')
      .update({
        download_url: file.download_url,
        download_expires_at: downloadExpiresAt,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    return file.download_url
  }

  /**
   * Fetch and save recordings for a booking
   */
  async fetchAndSaveRecordings(bookingId: string, meetingProviderId: string, userId: string): Promise<Recording[]> {
    const zoomData = await this.fetchMeetingRecordings(meetingProviderId, userId)

    if (!zoomData || zoomData.recording_files.length === 0) {
      return []
    }

    return await this.saveRecordingToDatabase(zoomData, bookingId)
  }
}

export const zoomRecordingService = new ZoomRecordingService()
