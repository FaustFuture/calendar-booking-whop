'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, User, Video, Link as LinkIcon, MapPin, Upload, X, File } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityPattern } from '@/lib/types/database'
import { format, addDays, startOfWeek, isSameDay, parse, setHours, setMinutes } from 'date-fns'
import { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from '../shared/Drawer'
import { useToast } from '@/lib/context/ToastContext'
import { useWhopUser } from '@/lib/context/WhopUserContext'

interface Slot {
  id: string // Format: pattern_id:YYYY-MM-DD:HH:mm
  start_time: string
  end_time: string
  is_booked: boolean
}

interface ViewSlotsDrawerProps {
  isOpen: boolean
  onClose: () => void
  pattern: AvailabilityPattern | null
  companyId: string
  onBookingSuccess?: () => void
  currentUserId?: string | null  // Pass the current user ID from parent
  currentUserEmail?: string | null  // Pass the current user email from parent
}

export default function ViewSlotsDrawer({
  isOpen,
  onClose,
  pattern,
  companyId,
  onBookingSuccess,
  currentUserId = null,
  currentUserEmail = null
}: ViewSlotsDrawerProps) {
  const { showSuccess, showError, showWarning } = useToast()
  const { user } = useWhopUser()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isGuest = !currentUserId  // Determine from passed prop
  const supabase = createClient()

  console.log('🔐 ViewSlotsDrawer user context:', {
    currentUserId,
    currentUserEmail,
    isGuest
  })

  // Reset to current week and load slots when modal opens
  useEffect(() => {
    if (isOpen && pattern) {
      // Determine the best week to display
      const today = new Date()
      const currentWeek = startOfWeek(today, { weekStartsOn: 1 })

      // If pattern has a start date in the future, start from that week
      if (pattern.start_date) {
        const patternStart = new Date(pattern.start_date)
        const patternWeek = startOfWeek(patternStart, { weekStartsOn: 1 })

        // Use the later of current week or pattern start week
        if (patternWeek > currentWeek) {
          setCurrentWeekStart(patternWeek)
        } else {
          setCurrentWeekStart(currentWeek)
        }
      } else {
        setCurrentWeekStart(currentWeek)
      }

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

      // Get pattern date range boundaries
      const patternStartDate = pattern.start_date ? new Date(pattern.start_date) : null
      const patternEndDate = pattern.end_date ? new Date(pattern.end_date) : null

      // Map day names to date-fns day indices (Mon=1, Tue=2, etc.)
      const dayMap: Record<string, number> = {
        'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0
      }

      // Iterate through each day in the current week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDay = addDays(currentWeekStart, dayOffset)
        const dayName = format(currentDay, 'EEE') // Mon, Tue, etc.

        // Check if this day is within the pattern's date range
        const currentDayDate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate())

        if (patternStartDate) {
          const startDateOnly = new Date(patternStartDate.getFullYear(), patternStartDate.getMonth(), patternStartDate.getDate())
          if (currentDayDate < startDateOnly) {
            continue
          }
        }

        if (patternEndDate) {
          const endDateOnly = new Date(patternEndDate.getFullYear(), patternEndDate.getMonth(), patternEndDate.getDate())
          if (currentDayDate > endDateOnly) {
            continue
          }
        }

        // Check if this day has availability in the pattern
        const daySchedule = weeklySchedule[dayName]
        if (!daySchedule || !Array.isArray(daySchedule)) {
          continue
        }

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
        showWarning('Missing Information', 'Please enter your name and email to book')
        return
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail)) {
        showWarning('Invalid Email', 'Please enter a valid email address')
        return
      }
    }

    try {
      setBooking(true)

      // Prepare booking data
      // Note: admin_id will be determined by the API based on company_id
      const bookingData: any = {
        pattern_id: pattern.id,
        companyId: companyId,
        title: pattern.title,
        description: pattern.description,
        status: 'upcoming',
        booking_start_time: selectedSlot.start_time,
        booking_end_time: selectedSlot.end_time,
        notes: notes.trim() || undefined,
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

      // Upload files if any
      if (selectedFiles.length > 0 && result.data?.id) {
        try {
          const formData = new FormData()
          selectedFiles.forEach((file) => {
            formData.append('files', file)
          })
          formData.append('bookingId', result.data.id)
          formData.append('companyId', companyId)

          const uploadResponse = await fetch('/api/bookings/attachments', {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json()
            console.error('Failed to upload files:', errorData)
            
            // Check if it's a file size error
            if (errorData.error === 'File size exceeded') {
              showError('File Upload Failed', errorData.message || 'One or more files exceed the 10MB limit.')
            } else {
              showWarning('Booking Created', 'Booking was created but some files failed to upload.')
            }
          } else {
            console.log('✅ Files uploaded successfully')
          }
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError)
          showWarning('Booking Created', 'Booking was created but file upload failed.')
        }
      }

      showSuccess('Booking Successful!', 'You will receive a confirmation email.')
      onBookingSuccess?.()
      loadSlots() // Reload slots to reflect the new booking

      // Reset form
      setGuestName('')
      setGuestEmail('')
      setNotes('')
      setSelectedFiles([])
    } catch (error) {
      console.error('Error booking slot:', error)
      showError('Booking Failed', 'Please try again.')
    } finally {
      setBooking(false)
      setSelectedSlot(null)
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      } else {
        validFiles.push(file)
      }
    })

    if (invalidFiles.length > 0) {
      showError(
        'File Size Exceeded',
        `The following files exceed the 10MB limit and cannot be uploaded:\n${invalidFiles.join('\n')}\n\nPlease select smaller files.`
      )
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
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
    <Drawer open={isOpen} onClose={onClose} width="xl">
      {/* Header */}
      <DrawerHeader title={pattern.title} onClose={onClose}>
        {pattern.description && (
          <p className="text-zinc-400 text-sm mb-3">{pattern.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Clock className="w-4 h-4 text-zinc-400" />
            {pattern.duration_minutes} min
          </span>
          <span className={`flex items-center gap-1.5 ${meetingDisplay.color}`}>
            <MeetingIcon className="w-4 h-4" />
            {meetingDisplay.label}
          </span>
        </div>
      </DrawerHeader>

      <DrawerContent>
        {/* Week Navigation */}
        <div className="mb-4 -mx-6 px-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
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
        <div>
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
      </DrawerContent>

        {/* Footer */}
        {selectedSlot && (
          <DrawerFooter>
            <div className="space-y-4">
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
                  <span className="text-white font-medium">{user?.name || currentUserEmail || 'Logged in user'}</span>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-300">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or special requests..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* File Upload Section */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-300">
                Attachments (Optional, up to 10MB per file)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Files</span>
              </label>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{file.name}</p>
                          <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
                        type="button"
                      >
                        <X className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  setSelectedSlot(null)
                  setGuestName('')
                  setGuestEmail('')
                  setNotes('')
                  setSelectedFiles([])
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
          </DrawerFooter>
        )}
    </Drawer>
  )
}
