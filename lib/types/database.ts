export type UserRole = 'admin' | 'member'

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled'

export type MeetingType = 'google_meet' | 'zoom' | 'manual_link' | 'location'

export type OAuthProvider = 'google' | 'zoom'

export interface MeetingConfig {
  requiresGeneration?: boolean
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
  admin_id: string
  title: string
  description?: string
  status: BookingStatus
  meeting_url?: string
  notes?: string
  guest_name?: string
  guest_email?: string
  booking_start_time?: string
  booking_end_time?: string
  created_at: string
  updated_at: string
}

export interface Recording {
  id: string
  booking_id: string
  url: string
  title: string
  duration?: number // in seconds
  file_size?: number // in bytes
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

export interface AvailabilityPattern {
  id: string
  admin_id: string
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
  created_at: string
  updated_at: string
}

// Extended types with relationships
export interface BookingWithRelations extends Booking {
  member?: User
  admin?: User
  slot?: AvailabilitySlot
  pattern?: AvailabilityPattern
  recordings?: Recording[]
}

export interface AvailabilitySlotWithRelations extends AvailabilitySlot {
  admin?: User
  bookings?: Booking[]
}

export interface RecordingWithRelations extends Recording {
  booking?: BookingWithRelations
}
