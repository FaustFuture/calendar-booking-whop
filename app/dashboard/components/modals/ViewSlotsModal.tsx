'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, DollarSign, User, Video, Link as LinkIcon, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityPattern } from '@/lib/types/database'
import { format, addDays, startOfWeek, isSameDay, parse, setHours, setMinutes } from 'date-fns'

interface Slot {
  id: string // Format: pattern_id:YYYY-MM-DD:HH:mm
  start_time: string
  end_time: string
  is_booked: boolean
}

interface ViewSlotsModalProps {
  isOpen: boolean
  onClose: () => void
  pattern: AvailabilityPattern | null
  companyId: string
  onBookingSuccess?: () => void
  currentUserId?: string | null  // Pass the current user ID from parent
  currentUserEmail?: string | null  // Pass the current user email from parent
}

export default function ViewSlotsModal({
  isOpen,
  onClose,
  pattern,
  companyId,
  onBookingSuccess,
  currentUserId = null,
  currentUserEmail = null
}: ViewSlotsModalProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const isGuest = !currentUserId  // Determine from passed prop
  const supabase = createClient()

  console.log('🔐 ViewSlotsModal user context:', {
    currentUserId,
    currentUserEmail,
    isGuest
  })

  // Reset to current week and load slots when modal opens
  useEffect(() => {
    if (isOpen && pattern) {
      // Reset to current week when modal opens
      const today = startOfWeek(new Date(), { weekStartsOn: 1 })
      setCurrentWeekStart(today)
      loadSlots()
    }
  }, [isOpen, pattern])

  // Reload slots when week changes
  useEffect(() => {
    if (isOpen && pattern) {
      loadSlots()
    }
  }, [currentWeekStart])

  async function loadSlots() {
    if (!pattern) return

    try {
      setLoading(true)

      // Calculate week range
      const weekEnd = addDays(currentWeekStart, 7)

      // Generate slots dynamically from pattern's weekly_schedule
      const generatedSlots: Slot[] = []
      const weeklySchedule = pattern.weekly_schedule as Record<string, Array<{ start: string; end: string }>>

      // Map day names to date-fns day indices (Mon=1, Tue=2, etc.)
      const dayMap: Record<string, number> = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0
      }

      // Iterate through each day in the current week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDay = addDays(currentWeekStart, dayOffset)
        const dayName = format(currentDay, 'EEE') // Mon, Tue, etc.

        // Check if this day has availability in the pattern
        const daySchedule = weeklySchedule[dayName]
        if (!daySchedule || !Array.isArray(daySchedule)) continue

        // Generate slots for each time range
        for (const timeRange of daySchedule) {
          const startTime = timeRange.start // e.g., "09:00"
          const endTime = timeRange.end     // e.g., "17:00"

          // Parse start and end times
          const [startHour, startMin] = startTime.split(':').map(Number)
          const [endHour, endMin] = endTime.split(':').map(Number)

          let slotStart = setMinutes(setHours(currentDay, startHour), startMin)
          const rangeEnd = setMinutes(setHours(currentDay, endHour), endMin)

          // Generate slots in increments of duration_minutes
          while (slotStart < rangeEnd) {
            const slotEnd = addDays(slotStart, 0)
            slotEnd.setMinutes(slotEnd.getMinutes() + pattern.duration_minutes)

            if (slotEnd <= rangeEnd) {
              const slotId = `${pattern.id}:${format(slotStart, 'yyyy-MM-dd:HH:mm')}`
              generatedSlots.push({
                id: slotId,
                start_time: slotStart.toISOString(),
                end_time: slotEnd.toISOString(),
                is_booked: false
              })
            }

            slotStart = slotEnd
          }
        }
      }

      // Fetch existing bookings for this pattern to mark booked slots
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_start_time, booking_end_time, status')
        .eq('pattern_id', pattern.id)
        .in('status', ['upcoming', 'completed'])

      // Create a set of booked time slots for quick lookup
      const bookedTimeSlots = new Set(
        (bookingsData || [])
          .filter(booking => booking.booking_start_time) // Only process bookings with time
          .map(booking => new Date(booking.booking_start_time).toISOString())
      )

      // Get current time for filtering past slots
      const now = new Date()

      console.log('🕐 Current time:', now.toISOString())
      console.log('📊 Generated slots before filtering:', generatedSlots.length)

      // Mark slots as booked if they match an existing booking, and filter out past slots
      const slotsWithBookingStatus = generatedSlots
        .filter(slot => {
          // Only show slots that haven't started yet
          const slotStartTime = new Date(slot.start_time)
          return slotStartTime > now
        })
        .map(slot => ({
          ...slot,
          is_booked: bookedTimeSlots.has(new Date(slot.start_time).toISOString())
        }))

      console.log('✅ Available future slots:', slotsWithBookingStatus.length)
      console.log('📅 First available slot:', slotsWithBookingStatus[0]?.start_time)

      setSlots(slotsWithBookingStatus)
    } catch (error) {
      console.error('Error loading slots:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBookSlot() {
    if (!selectedSlot || !pattern) return

    console.log('🎟️ Booking attempt:', {
      hasUser: !!currentUserId,
      userId: currentUserId,
      isGuest
    })

    // Validate guest information if booking as guest
    if (isGuest) {
      if (!guestName.trim() || !guestEmail.trim()) {
        alert('Please enter your name and email to book')
        return
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail)) {
        alert('Please enter a valid email address')
        return
      }
    }

    try {
      setBooking(true)

      // Prepare booking data
      const bookingData: any = {
        pattern_id: pattern.id,
        admin_id: pattern.admin_id,
        companyId: companyId,
        title: pattern.title,
        description: pattern.description,
        status: 'upcoming',
        booking_start_time: selectedSlot.start_time,
        booking_end_time: selectedSlot.end_time,
      }

      // Add member_id or guest info
      if (currentUserId && !isGuest) {
        // Logged-in member booking
        bookingData.member_id = currentUserId
        console.log('👤 Creating member booking:', {
          member_id: currentUserId,
          email: currentUserEmail,
          isGuest,
        })
      } else {
        // Guest booking
        bookingData.guest_name = guestName.trim()
        bookingData.guest_email = guestEmail.trim()
        console.log('🎫 Creating guest booking:', {
          guest_name: guestName,
          guest_email: guestEmail,
          isGuest,
        })
      }

      console.log('📤 Booking data being sent:', bookingData)

      // Create booking via API (this triggers meeting link generation)
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const result = await response.json()
      console.log('✅ Booking created:', result.data)

      alert('Booking successful! You will receive a confirmation email.')
      onBookingSuccess?.()
      loadSlots() // Reload slots to reflect the new booking

      // Reset guest form
      setGuestName('')
      setGuestEmail('')
    } catch (error) {
      console.error('Error booking slot:', error)
      alert('Failed to book slot. Please try again.')
    } finally {
      setBooking(false)
      setSelectedSlot(null)
    }
  }

  function nextWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  function previousWeek() {
    const newWeekStart = addDays(currentWeekStart, -7)
    // Don't allow navigating to weeks in the past
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    if (newWeekStart >= today) {
      setCurrentWeekStart(newWeekStart)
    }
  }

  // Check if previous week button should be disabled
  const isPreviousWeekDisabled = () => {
    const today = startOfWeek(new Date(), { weekStartsOn: 1 })
    const previousWeekStart = addDays(currentWeekStart, -7)
    return previousWeekStart < today
  }

  function getMeetingTypeDisplay(meetingType?: string) {
    switch (meetingType) {
      case 'google_meet':
        return { icon: Video, label: 'Google Meet', color: 'text-blue-400' }
      case 'zoom':
        return { icon: Video, label: 'Zoom', color: 'text-blue-600' }
      case 'manual_link':
        return { icon: LinkIcon, label: 'Custom Link', color: 'text-purple-400' }
      case 'location':
        return { icon: MapPin, label: 'In Person', color: 'text-green-400' }
      default:
        return { icon: Video, label: 'Meeting', color: 'text-zinc-400' }
    }
  }

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    const day = format(new Date(slot.start_time), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)

  if (!isOpen || !pattern) return null

  const meetingDisplay = getMeetingTypeDisplay(pattern.meeting_type)
  const MeetingIcon = meetingDisplay.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{pattern.title}</h2>
              {pattern.description && (
                <p className="text-zinc-400 text-sm mb-3">{pattern.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  {pattern.duration_minutes} min
                </span>
                {pattern.price && pattern.price > 0 && (
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                    ${pattern.price}
                  </span>
                )}
                <span className={`flex items-center gap-1.5 ${meetingDisplay.color}`}>
                  <MeetingIcon className="w-4 h-4" />
                  {meetingDisplay.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <button
            onClick={previousWeek}
            disabled={isPreviousWeekDisabled()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-800"
          >
            Previous Week
          </button>
          <span className="text-white font-medium">
            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </span>
          <button
            onClick={nextWeek}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Next Week
          </button>
        </div>

        {/* Slots Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-zinc-400 mt-4">Loading slots...</p>
            </div>
          ) : Object.keys(slotsByDay).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">No available slots this week</p>
              <p className="text-zinc-500 text-sm mt-2">Try selecting a different week</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(slotsByDay).map(([day, daySlots]) => (
                <div key={day}>
                  <h3 className="text-white font-semibold mb-3">
                    {format(new Date(day), 'EEEE, MMMM d')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => !slot.is_booked && setSelectedSlot(slot)}
                        disabled={slot.is_booked}
                        className={`
                          p-3 rounded-lg border text-sm font-medium transition-all
                          ${slot.is_booked
                            ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed'
                            : selectedSlot?.id === slot.id
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-white hover:border-emerald-500 hover:bg-zinc-700'
                          }
                        `}
                      >
                        {format(new Date(slot.start_time), 'h:mm a')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedSlot && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 space-y-4">
            {/* Selected time info */}
            <div className="text-sm">
              <p className="text-zinc-400 mb-1">Selected time:</p>
              <p className="text-white font-semibold">
                {format(new Date(selectedSlot.start_time), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(new Date(selectedSlot.start_time), 'h:mm a')}
              </p>
            </div>

            {/* User information */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              {isGuest ? (
                <>
                  <p className="text-sm font-medium text-zinc-300">Your Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Email *</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-zinc-300">Booking as:</span>
                  <span className="text-white font-medium">{currentUserEmail || 'Logged in user'}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedSlot(null)
                  setGuestName('')
                  setGuestEmail('')
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBookSlot}
                disabled={booking}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {booking ? 'Booking...' : 'Book Slot'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
