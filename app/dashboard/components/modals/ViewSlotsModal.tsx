'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, DollarSign, User, Video, Link as LinkIcon, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityPattern } from '@/lib/types/database'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

interface Slot {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
}

interface ViewSlotsModalProps {
  isOpen: boolean
  onClose: () => void
  pattern: AvailabilityPattern | null
  onBookingSuccess?: () => void
}

export default function ViewSlotsModal({ isOpen, onClose, pattern, onBookingSuccess }: ViewSlotsModalProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && pattern) {
      loadSlots()
    }
  }, [isOpen, pattern, currentWeekStart])

  async function loadSlots() {
    if (!pattern) return

    try {
      setLoading(true)

      // Calculate week range
      const weekEnd = addDays(currentWeekStart, 7)

      // Fetch slots for this pattern within the week
      const { data: slotsData } = await supabase
        .from('slots')
        .select('id, start_time, end_time, is_booked')
        .eq('pattern_id', pattern.id)
        .gte('start_time', currentWeekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true })

      setSlots(slotsData || [])
    } catch (error) {
      console.error('Error loading slots:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleBookSlot() {
    if (!selectedSlot || !pattern) return

    try {
      setBooking(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to book a slot')
        return
      }

      // Create booking
      const { error } = await supabase
        .from('bookings')
        .insert({
          slot_id: selectedSlot.id,
          member_id: user.id,
          admin_id: pattern.admin_id,
          title: pattern.title,
          description: pattern.description,
          price: pattern.price || 0,
          status: 'upcoming',
        })

      if (error) throw error

      // Mark slot as booked
      await supabase
        .from('slots')
        .update({ is_booked: true })
        .eq('id', selectedSlot.id)

      alert('Booking successful!')
      onBookingSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error booking slot:', error)
      alert('Failed to book slot. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  function nextWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  function previousWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, -7))
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
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
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
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="text-zinc-400 mb-1">Selected time:</p>
                <p className="text-white font-semibold">
                  {format(new Date(selectedSlot.start_time), 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(new Date(selectedSlot.start_time), 'h:mm a')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookSlot}
                  disabled={booking}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {booking ? 'Booking...' : 'Book Slot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
