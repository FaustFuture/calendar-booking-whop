'use client'

import { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/lib/context/ToastContext'
import { getUserTimezone, getTimezoneLabel } from '@/lib/utils/timezone'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'

interface RescheduleBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookingId: string
  bookingTitle: string
  currentStartTime: string
  currentEndTime: string
  companyId: string
}

export default function RescheduleBookingModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  bookingTitle,
  currentStartTime,
  currentEndTime,
  companyId,
}: RescheduleBookingModalProps) {
  const { showSuccess, showError } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const userTimezone = getUserTimezone()
  const timezoneLabel = getTimezoneLabel(userTimezone)

  // Convert current times to datetime-local format (YYYY-MM-DDTHH:MM)
  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [newStartTime, setNewStartTime] = useState(formatDateTimeLocal(currentStartTime))
  const [newEndTime, setNewEndTime] = useState(formatDateTimeLocal(currentEndTime))

  // Calculate duration in minutes
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
  }

  const currentDuration = calculateDuration(currentStartTime, currentEndTime)

  // Auto-update end time when start time changes, preserving duration
  const handleStartTimeChange = (newStart: string) => {
    setNewStartTime(newStart)

    if (newStart) {
      const startDate = new Date(newStart)
      const endDate = new Date(startDate.getTime() + currentDuration * 60 * 1000)
      setNewEndTime(formatDateTimeLocal(endDate.toISOString()))
    }
  }

  const handleSubmit = async () => {
    // Validate times
    if (!newStartTime || !newEndTime) {
      showError('Invalid Times', 'Please select both start and end times')
      return
    }

    const start = new Date(newStartTime)
    const end = new Date(newEndTime)

    if (end <= start) {
      showError('Invalid Times', 'End time must be after start time')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/bookings/${bookingId}?companyId=${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_start_time: start.toISOString(),
          booking_end_time: end.toISOString(),
          timezone: userTimezone,
          companyId,
        }),
      })

      if (response.ok) {
        showSuccess(
          'Meeting Rescheduled',
          'The meeting has been rescheduled successfully. The attendee will be notified.'
        )
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        showError('Failed to reschedule', error.error || 'An error occurred')
      }
    } catch (error) {
      showError('Failed to reschedule', 'Please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={isOpen} onClose={onClose} width="md">
      <DrawerHeader title="Reschedule Meeting" onClose={onClose} />

      <DrawerContent>
        <div className="space-y-6">
          {/* Meeting Info */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Meeting</h3>
            <p className="text-white font-medium">{bookingTitle}</p>
          </div>

          {/* Current Time */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Current Time</h3>
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300">
                    {format(new Date(currentStartTime), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300">
                    {format(new Date(currentStartTime), 'h:mm a')} -{' '}
                    {format(new Date(currentEndTime), 'h:mm a')}
                  </span>
                </div>
                <div className="text-sm text-zinc-400">
                  Duration: {currentDuration} minutes
                </div>
              </div>
            </div>
          </div>

          {/* New Time Selection */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">New Time</h3>
            <div className="space-y-4">
              {/* Start Time */}
              <div>
                <label className="block text-sm text-zinc-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={newStartTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm text-zinc-300 mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* Duration Preview */}
              {newStartTime && newEndTime && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="text-sm text-emerald-400">
                    New duration: {calculateDuration(newStartTime, newEndTime)} minutes
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timezone Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200">
              Times are shown in your timezone: {timezoneLabel}
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-200">
              The attendee will receive a notification about the new meeting time, and the Google
              Calendar event will be updated automatically.
            </p>
          </div>
        </div>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={submitting || !newStartTime || !newEndTime}
          >
            {submitting ? 'Rescheduling...' : 'Reschedule Meeting'}
          </button>
        </div>
      </DrawerFooter>
    </Drawer>
  )
}
