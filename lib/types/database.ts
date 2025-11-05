export type UserRole = 'admin' | 'member'

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled'

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
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  slot_id?: string
  member_id: string
  admin_id: string
  title: string
  description?: string
  status: BookingStatus
  meeting_url?: string
  notes?: string
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

// Extended types with relationships
export interface BookingWithRelations extends Booking {
  member?: User
  admin?: User
  slot?: AvailabilitySlot
  recordings?: Recording[]
}

export interface AvailabilitySlotWithRelations extends AvailabilitySlot {
  admin?: User
  bookings?: Booking[]
}

export interface RecordingWithRelations extends Recording {
  booking?: BookingWithRelations
}
