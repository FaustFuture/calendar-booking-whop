export type UserRole = 'admin' | 'member'

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled'

export type MeetingType = 'zoom' | 'google_meet' | 'manual_link' | 'location'

export type OAuthProvider = 'zoom' | 'google'

export type RecordingProvider = 'google' | 'zoom' | 'manual'

export type RecordingStatus = 'processing' | 'available' | 'failed' | 'deleted'

export type RecordingType = 'cloud' | 'local'

export interface MeetingConfig {
  requiresGeneration?: boolean
  enableRecording?: boolean
  manualValue?: string // For manual_link and location types
  customSettings?: Record<string, unknown>
}

export interface User {
  id: string
  role: UserRole
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface AvailabilitySlot {
  id: string
  admin_id: string
  start_time: string
  end_time: string
  is_available: boolean
  title?: string
  description?: string
  meeting_type?: MeetingType
  meeting_config?: MeetingConfig
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  slot_id?: string
  pattern_id?: string
  member_id?: string
  company_id: string
  title: string
  description?: string
  status: BookingStatus
  meeting_url?: string // Generated Zoom/Google Meet link
  manual_meeting_url?: string // Manual meeting link (e.g., custom Google Meet, other platforms)
  calendar_event_id?: string // Google Calendar event ID for syncing deletions
  notes?: string
  guest_name?: string
  guest_email?: string
  booking_start_time?: string
  booking_end_time?: string
  timezone?: string // IANA timezone identifier from the availability pattern
  // Recurrence fields
  recurrence_group_id?: string // UUID linking recurring bookings together
  recurrence_index?: number // Index in the series (0, 1, 2, ...)
  is_recurring_instance?: boolean // Whether this is part of a recurring series
  notification_24h_sent?: boolean
  notification_2h_sent?: boolean
  notification_30min_sent?: boolean
  recording_fetch_immediate?: boolean
  recording_fetch_auto_complete?: boolean
  recording_fetch_15min?: boolean
  created_at: string
  updated_at: string
}

export interface Recording {
  id: string
  company_id?: string // Whop company ID (biz_xxx) for multi-tenant isolation
  booking_id?: string // Optional - can be standalone recording
  url: string
  title: string
  duration?: number // in seconds
  file_size?: number // in bytes
  provider: RecordingProvider
  external_id?: string // Provider's recording ID
  meeting_provider_id?: string // Provider's meeting ID
  playback_url?: string // Streaming URL (usually permanent)
  download_url?: string // Download URL (may expire)
  download_expires_at?: string // When download URL expires
  transcript_url?: string // Transcript file URL
  transcript_vtt_url?: string // VTT format transcript
  status: RecordingStatus
  recording_type: RecordingType
  metadata?: Record<string, unknown> // Provider-specific data
  auto_fetched: boolean // True if automatically fetched
  fetched_at?: string // When recording was fetched
  last_synced_at?: string // Last metadata sync
  uploaded_at: string
  created_at: string
}

export interface OAuthConnection {
  id: string
  user_id: string
  provider: OAuthProvider
  access_token: string
  refresh_token?: string
  token_type: string
  expires_at: string
  scope?: string
  provider_user_id?: string
  provider_email?: string
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type RecurrenceEndType = 'count' | 'date'

export interface AvailabilityPattern {
  id: string
  company_id: string
  created_by?: string // Whop user ID of the admin who created this pattern
  timezone: string // IANA timezone identifier (e.g., 'America/New_York')
  title: string
  description?: string
  duration_minutes: number
  price?: number
  meeting_type?: MeetingType
  meeting_config?: MeetingConfig
  start_date: string
  end_date?: string
  weekly_schedule: Record<string, Array<{ start: string; end: string }>>
  is_active: boolean
  // Recurrence configuration
  is_recurring?: boolean
  recurrence_type?: RecurrenceType
  recurrence_interval?: number // e.g., every 2 weeks
  recurrence_days_of_week?: string[] // ['Mon', 'Wed', 'Fri']
  recurrence_day_of_month?: number // 1-31
  recurrence_end_type?: RecurrenceEndType
  recurrence_count?: number // Number of occurrences
  recurrence_end_date?: string // End date for recurrence
  created_at: string
  updated_at: string
}

// Extended types with relationships
export interface BookingAttachment {
  id: string
  booking_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type?: string
  uploaded_by?: string // Whop user ID (user_xxx format)
  created_at: string
}

export interface BookingWithRelations extends Booking {
  member?: User
  slot?: AvailabilitySlot
  pattern?: AvailabilityPattern
  recordings?: Recording[]
  attachments?: BookingAttachment[]
}

export interface AvailabilitySlotWithRelations extends AvailabilitySlot {
  admin?: User
  bookings?: Booking[]
}

export interface RecordingWithRelations extends Recording {
  booking?: BookingWithRelations
}

// Google Calendar Types
export interface GoogleCalendarEvent {
  id: string
  summary?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  status?: string
  transparency?: string // 'transparent' or 'opaque'
}

export interface CalendarBusyTime {
  start: string // ISO timestamp
  end: string // ISO timestamp
  summary?: string // Event title (optional, for debugging)
}

export interface CalendarEventsResponse {
  busyTimes: CalendarBusyTime[]
  cached: boolean
  cacheExpiry?: string
}
