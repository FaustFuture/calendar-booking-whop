'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Video, Link as LinkIcon, Loader2 } from 'lucide-react'
import { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from '../shared/Drawer'
import { useToast } from '@/lib/context/ToastContext'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUserTimezone } from '@/lib/utils/timezone'

const LINK_TYPES = ['zoom', 'manual'] as const
type LinkPreference = (typeof LINK_TYPES)[number]

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

const DEFAULT_MEETING_DURATION_MINUTES = 60

const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, index) => {
  const totalMinutes = index * 15
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const label = format(new Date(2020, 0, 1, hours, minutes), 'h:mm a')
  return { value, label }
})

const bookingSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  meeting_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  // manual_meeting_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  booking_start_time: z.string().min(1, 'Start time is required'),
  booking_end_time: z.string().min(1, 'End time is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  notes: z.string().max(1000).optional(),
  link_type: z.enum(LINK_TYPES),
}).refine(
  (data) => {
    if (!data.booking_start_time || !data.booking_end_time) return true
    return new Date(data.booking_end_time) > new Date(data.booking_start_time)
  },
  {
    message: 'End time must be after start time',
    path: ['booking_end_time'],
  }
)

type BookingFormData = z.infer<typeof bookingSchema>

interface CreateBookingDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companyId: string
}

export default function CreateBookingDrawer({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: CreateBookingDrawerProps) {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [generatingZoomLink, setGeneratingZoomLink] = useState(false)
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const timezoneOptions = useMemo(() => {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
      return (Intl as any).supportedValuesOf('timeZone') as string[]
    }
    return FALLBACK_TIMEZONES
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      meeting_url: '',
      // manual_meeting_url: '',
      booking_start_time: '',
      booking_end_time: '',
      timezone: getUserTimezone(),
      link_type: 'zoom',
    },
  })

  const meetingUrl = watch('meeting_url')
  // const manualMeetingUrl = watch('manual_meeting_url')
  const selectedTimezone = watch('timezone')
  const selectedLinkType = watch('link_type')
  const resolvedLinkType: LinkPreference = (selectedLinkType as LinkPreference) || 'zoom'
  const isZoomSelected = resolvedLinkType === 'zoom'
  const isManualSelected = resolvedLinkType === 'manual'

  const buildDateTimeValue = (date: Date, time: string) =>
    `${format(date, 'yyyy-MM-dd')}T${time}`

  const resetDateTimeFields = () => {
    setStartDate(null)
    setStartTime('')
    setEndDate(null)
    setEndTime('')
    setValue('booking_start_time', '', { shouldDirty: true })
    setValue('booking_end_time', '', { shouldDirty: true })
  }

  // Load members and seed date/time defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMembers()

      const currentStart = getValues('booking_start_time')
      let startReference: Date

      if (currentStart) {
        startReference = new Date(currentStart)
      } else {
        const now = new Date()
        now.setMinutes(now.getMinutes() + (15 - (now.getMinutes() % 15 || 15)))
        startReference = now
        setValue('booking_start_time', buildDateTimeValue(startReference, format(startReference, 'HH:mm')))
      }

      setStartDate(startReference)
      setStartTime(format(startReference, 'HH:mm'))

      const currentEnd = getValues('booking_end_time')
      let endReference: Date

      if (currentEnd) {
        endReference = new Date(currentEnd)
      } else {
        endReference = new Date(startReference.getTime() + DEFAULT_MEETING_DURATION_MINUTES * 60 * 1000)
        setValue('booking_end_time', buildDateTimeValue(endReference, format(endReference, 'HH:mm')))
      }

      setEndDate(endReference)
      setEndTime(format(endReference, 'HH:mm'))
    } else {
      resetDateTimeFields()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Sync start datetime with form state
  useEffect(() => {
    if (startDate && startTime) {
      setValue('booking_start_time', buildDateTimeValue(startDate, startTime), {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }, [startDate, startTime, setValue])

  // Sync end datetime with form state
  useEffect(() => {
    if (endDate && endTime) {
      setValue('booking_end_time', buildDateTimeValue(endDate, endTime), {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }, [endDate, endTime, setValue])

  // Ensure end time always stays after start time
  useEffect(() => {
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(buildDateTimeValue(startDate, startTime))
      const end = new Date(buildDateTimeValue(endDate, endTime))
      if (end <= start) {
        const adjusted = new Date(start.getTime() + DEFAULT_MEETING_DURATION_MINUTES * 60 * 1000)
        const adjustedTime = format(adjusted, 'HH:mm')
        setEndDate(adjusted)
        setEndTime(adjustedTime)
        setValue('booking_end_time', buildDateTimeValue(adjusted, adjustedTime), {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
    }
  }, [startDate, startTime, endDate, endTime, setValue])

  async function loadMembers() {
    setMembersLoading(true)
    try {
      // Load members from Whop API
      const membersResponse = await fetch(`/api/members?companyId=${companyId}`)
      if (!membersResponse.ok) {
        const errorData = await membersResponse.json()
        throw new Error(errorData.error || 'Failed to load members')
      }
      const membersData = await membersResponse.json()
      setMembers(membersData.members || [])
    } catch (error) {
      showError('Failed to Load Members', error instanceof Error ? error.message : 'Failed to load members. Please try again.')
    } finally {
      setMembersLoading(false)
    }
  }

  async function generateZoomLink() {
    const formData = watch()
    if (!formData.title || !formData.booking_start_time || !formData.booking_end_time) {
      showError('Missing Information', 'Please fill in title, start time, and end time before generating a Zoom link.')
      return
    }

    if (!formData.member_id) {
      showError('Missing Information', 'Please select a member before generating a Zoom link.')
      return
    }

    setGeneratingZoomLink(true)
    try {
      const selectedMember = members.find(m => m.id === formData.member_id)
      const attendeeEmails = selectedMember?.email ? [selectedMember.email] : []

      const response = await fetch('/api/meetings/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'zoom',
          title: formData.title,
          description: formData.description || '',
          startTime: formData.booking_start_time,
          endTime: formData.booking_end_time,
          attendeeEmails,
          timezone: formData.timezone || 'UTC',
          companyId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate Zoom link')
      }

      const result = await response.json()
      setValue('meeting_url', result.meetingUrl)
      showSuccess('Zoom Link Generated', 'Zoom meeting link has been generated successfully.')
    } catch (error) {
      showError('Failed to Generate Zoom Link', error instanceof Error ? error.message : 'Failed to generate Zoom link. Please try again.')
    } finally {
      setGeneratingZoomLink(false)
    }
  }

  async function onSubmit(data: BookingFormData) {
    setLoading(true)

    if (!data.meeting_url) {
      showError('Missing Meeting Link', 'Please provide a meeting link.')
      setLoading(false)
      return
    }

    const { link_type: _linkType, ...rest } = data
    const payload = {
      ...rest,
      meeting_url: data.meeting_url,
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          companyId,
          status: 'upcoming',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      reset()
      resetDateTimeFields()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Booking failed:', error)
      showError('Booking Failed', error instanceof Error ? error.message : 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Drawer open={isOpen} onClose={onClose} width="lg">
      <DrawerHeader title="Create Booking" onClose={onClose} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
        <DrawerContent>
          <div className="space-y-4">
            {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Member *
            </label>
            <select 
              {...register('member_id')} 
              className="input w-full"
              disabled={membersLoading}
            >
              <option value="">
                {membersLoading ? 'Loading members...' : 'Select a member'}
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.email ? `(${member.email})` : ''}
                </option>
              ))}
            </select>
            {errors.member_id && (
              <p className="text-red-400 text-sm mt-1">{errors.member_id.message}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              {...register('title')}
              className="input w-full"
              placeholder="e.g., Strategy Session"
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="input w-full min-h-[100px]"
              placeholder="Booking details..."
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Date and Time (required for Zoom generation) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Start Date *
                  </label>
                  <DatePicker
                    date={startDate}
                    onDateChange={(date) => setStartDate(date ?? null)}
                    placeholder="Select start date"
                    minDate={new Date()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Start Time *
                  </label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-60 z-[1050]">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-white">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.booking_start_time && (
                  <p className="text-red-400 text-sm">{errors.booking_start_time.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    End Date *
                  </label>
                  <DatePicker
                    date={endDate}
                    onDateChange={(date) => setEndDate(date ?? null)}
                    placeholder="Select end date"
                    minDate={startDate ?? undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    End Time *
                  </label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-60 z-[1050]">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-white">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.booking_end_time && (
                  <p className="text-red-400 text-sm">{errors.booking_end_time.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Timezone *
              </label>
              <Select
                value={selectedTimezone}
                onValueChange={(value) =>
                  setValue('timezone', value, { shouldValidate: true, shouldDirty: true })
                }
              >
                <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-72 z-[1050]">
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-white">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && (
                <p className="text-red-400 text-sm mt-1">{errors.timezone.message}</p>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                Calendar invites and reminders will use this timezone.
              </p>
            </div>
          </div>

          {/* Link Preference */}
          <div className="space-y-2 ">
            <label className="block text-sm font-medium text-zinc-300">
              Which link should be sent to the attendee?
            </label>
            <Select
              value={resolvedLinkType}
              onValueChange={(value) =>
                setValue('link_type', value as LinkPreference, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Choose link type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white z-[1050]">
                <SelectItem value="zoom" className="text-white">
                  Use generated Zoom link
                </SelectItem>
                <SelectItem value="manual" className="text-white">
                  Use manual link
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.link_type && (
              <p className="text-red-400 text-sm">{errors.link_type.message}</p>
            )}
            <p className="text-xs text-zinc-500">
              You can generate a Zoom link and also save a manual link. The dropdown decides which one
              is sent in the booking confirmation.
            </p>
          </div>

          {/* Zoom Meeting Link Generation */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Zoom Meeting Link
            </label>
            <div
              className={`rounded-lg border p-3 transition-colors ${
                isZoomSelected
                  ? 'border-emerald-500/80 bg-emerald-500/5'
                  : 'border-zinc-700 bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-zinc-300">Auto-generated Zoom link</p>
                {isZoomSelected && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            <div className="flex gap-2">
              <input
                type="url"
                {...register('meeting_url')}
                className="input flex-1"
                placeholder="Generated Zoom link will appear here..."
                readOnly
              />
              <button
                type="button"
                onClick={generateZoomLink}
                disabled={generatingZoomLink || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                {generatingZoomLink ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Generate Zoom Link
                  </>
                )}
              </button>
            </div>
            {errors.meeting_url && (
              <p className="text-red-400 text-sm mt-1">{errors.meeting_url.message}</p>
            )}
            {meetingUrl && (
              <p className="text-emerald-400 text-sm mt-1">✓ Zoom link generated</p>
            )}
            </div>
          </div>

          {/* Manual Meeting Link */}
          {isManualSelected && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Manual Meeting Link
              </label>
              <div className="rounded-lg border border-emerald-500/80 bg-emerald-500/5 p-3 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-zinc-300">Paste any external meeting URL</p>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700">
                    <LinkIcon className="w-4 h-4 text-zinc-300" />
                  </span>
                  <input
                    type="url"
                    {...register('meeting_url')}
                    className="input flex-1"
                    placeholder="https://meet.google.com/... or any other meeting link"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Internal Notes
            </label>
            <textarea
              {...register('notes')}
              className="input w-full min-h-[80px]"
              placeholder="Private notes (not visible to member)..."
            />
            {errors.notes && (
              <p className="text-red-400 text-sm mt-1">{errors.notes.message}</p>
            )}
          </div>
          </div>
        </DrawerContent>

        <DrawerFooter>
          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </DrawerFooter>
      </form>
    </Drawer>
  )
}
