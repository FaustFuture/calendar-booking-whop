import { createClient } from '@/lib/supabase/client'

/**
 * Updates all bookings with 'upcoming' status to 'completed' if their end time has passed
 * This ensures past bookings appear in the past tab instead of the upcoming tab
 */
export async function updatePastBookingsStatus(): Promise<{
  updated: number
  error: string | null
}> {
  try {
    const supabase = createClient()
    const now = new Date().toISOString()

    // Find all upcoming bookings where the end time has passed
    const { data: pastBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        slot:slot_id(end_time),
        booking_end_time
      `)
      .eq('status', 'upcoming')

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError)
      return { updated: 0, error: fetchError.message }
    }

    if (!pastBookings || pastBookings.length === 0) {
      return { updated: 0, error: null }
    }

    // Filter bookings where end time has passed
    const bookingsToUpdate = pastBookings.filter(booking => {
      // Handle both single object and array responses from Supabase
      const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
      const endTime = (slot as any)?.end_time || booking.booking_end_time
      if (!endTime) return false
      return new Date(endTime) < new Date(now)
    })

    if (bookingsToUpdate.length === 0) {
      return { updated: 0, error: null }
    }

    // Update all past bookings to 'completed' status
    const bookingIds = bookingsToUpdate.map(b => b.id)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .in('id', bookingIds)

    if (updateError) {
      console.error('Error updating past bookings:', updateError)
      return { updated: 0, error: updateError.message }
    }

    console.log(`✅ Updated ${bookingIds.length} past bookings to completed status`)
    return { updated: bookingIds.length, error: null }
  } catch (error) {
    console.error('Unexpected error updating past bookings:', error)
    return { updated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
