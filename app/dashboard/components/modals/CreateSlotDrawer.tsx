'use client'

import { useState, useEffect } from 'react'
import { User, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from '../shared/Drawer'
import SegmentedControl, { SegmentOption } from '../shared/SegmentedControl'
import ConditionalSelect, { MeetingType } from '../shared/ConditionalSelect'
import SimplifiedSchedulePicker, { SimplifiedScheduleData } from '../shared/SchedulePicker/SimplifiedSchedulePicker'
import SlotsPreviewCount from '../shared/SchedulePicker/SlotsPreviewCount'
import SkeletonLoader from '../shared/SkeletonLoader'
import RecurrenceConfigPanel from '../shared/RecurrenceConfigPanel'
import { useToast } from '@/lib/context/ToastContext'
import { useConfirm } from '@/lib/context/ConfirmDialogContext'
import { getUserTimezone } from '@/lib/utils/timezone'
import { validateRecurrenceConfig } from '@/lib/utils/recurrence'
import { RecurrenceType, RecurrenceEndType } from '@/lib/types/database'

interface CreateSlotDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companyId: string
  patternId?: string
  editData?: {
    title: string
    description?: string
    duration_minutes: number
    meeting_type?: string
    meeting_config?: {
      manualValue?: string
      requiresGeneration?: boolean
    } | string // Allow string for JSON parsing fallback
    start_date: string
    end_date?: string
    weekly_schedule: Record<string, Array<{ start: string; end: string }>>
    // Recurrence fields
    is_recurring?: boolean
    recurrence_type?: RecurrenceType
    recurrence_interval?: number
    recurrence_days_of_week?: string[]
    recurrence_day_of_month?: number
    recurrence_end_type?: RecurrenceEndType
    recurrence_count?: number
    recurrence_end_date?: string
  }
}

const DURATION_OPTIONS: SegmentOption[] = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
]

export default function CreateSlotDrawer({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  patternId,
  editData,
}: CreateSlotDrawerProps) {
  const { showError } = useToast()
  const confirm = useConfirm()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [customDuration, setCustomDuration] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('zoom')
  const [meetingValue, setMeetingValue] = useState('')
  const [connectedEmail, setConnectedEmail] = useState('')
  const [scheduleData, setScheduleData] = useState<SimplifiedScheduleData>({
    days: {},
    dateRange: {
      start: new Date(),
      end: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // Default 4 weeks
      indefinite: false,
    },
  })
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    isRecurring: false,
    type: 'weekly' as RecurrenceType,
    interval: 1,
    daysOfWeek: [] as string[],
    dayOfMonth: 1,
    endType: 'count' as RecurrenceEndType,
    count: 10,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Schedule' },
    { number: 3, label: 'Recurrence' },
  ]

  useEffect(() => {
    if (isOpen) {
      setLoading(false)
      setConnectedEmail('Whop User')

      // Populate form if editing
      if (editData) {
        setTitle(editData.title)
        setDescription(editData.description || '')

        // Set duration
        const durationStr = editData.duration_minutes.toString()
        if (['15', '30', '60', '90'].includes(durationStr)) {
          setDuration(durationStr)
        } else {
          setDuration('custom')
          setCustomDuration(durationStr)
        }

        // Set meeting type
        setMeetingType((editData.meeting_type as MeetingType) || 'zoom')
        
        // Set meeting value (manual link or location) from meeting_config
        // Handle both parsed object and string JSON (for backwards compatibility)
        let meetingConfig = editData.meeting_config
        if (typeof meetingConfig === 'string') {
          try {
            meetingConfig = JSON.parse(meetingConfig)
          } catch (e) {
            // Failed to parse meeting_config
          }
        }
        
        if (typeof meetingConfig === 'object' && meetingConfig !== null && 'manualValue' in meetingConfig && meetingConfig.manualValue) {
          setMeetingValue(meetingConfig.manualValue)
        }

        // Set schedule data - transform the weekly_schedule to match SimplifiedScheduleData format
        const transformedDays: Record<string, { enabled: boolean; timeRanges: Array<{ id: string; startTime: string; endTime: string }> }> = {}
        Object.entries(editData.weekly_schedule).forEach(([day, ranges]) => {
          transformedDays[day] = {
            enabled: true,
            timeRanges: ranges.map((range, index) => ({
              id: `${Date.now()}-${index}`,
              startTime: range.start,
              endTime: range.end,
            })),
          }
        })

        setScheduleData({
          days: transformedDays,
          dateRange: {
            start: new Date(editData.start_date),
            end: editData.end_date ? new Date(editData.end_date) : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
            indefinite: !editData.end_date,
          },
        })

        // Set recurrence config from editData
        if (editData.is_recurring) {
          setRecurrenceConfig({
            isRecurring: true,
            type: editData.recurrence_type || 'weekly',
            interval: editData.recurrence_interval || 1,
            daysOfWeek: editData.recurrence_days_of_week || [],
            dayOfMonth: editData.recurrence_day_of_month || 1,
            endType: editData.recurrence_end_type || 'count',
            count: editData.recurrence_count || 10,
            endDate: editData.recurrence_end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
        } else {
          // Reset to default non-recurring config when editing a non-recurring pattern
          setRecurrenceConfig({
            isRecurring: false,
            type: 'weekly' as RecurrenceType,
            interval: 1,
            daysOfWeek: [] as string[],
            dayOfMonth: 1,
            endType: 'count' as RecurrenceEndType,
            count: 10,
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
        }
      } else {
        // Reset form for new pattern
        resetForm()
      }
    }
  }, [isOpen, editData])

  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (duration === 'custom' && (!customDuration || parseInt(customDuration) <= 0)) {
      newErrors.duration = 'Please enter a valid duration'
    }

    if (meetingType === 'manual_link' && !meetingValue.trim()) {
      newErrors.meeting = 'Meeting URL is required'
    }

    if (meetingType === 'location' && !meetingValue.trim()) {
      newErrors.meeting = 'Location address is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateStep2(): boolean {
    const newErrors: Record<string, string> = {}

    // Check if at least one day is enabled
    const hasEnabledDays = Object.values(scheduleData.days).some(day => day.enabled)
    if (!hasEnabledDays) {
      newErrors.schedule = 'Please select at least one day with time range'
    }

    // Validate time ranges for enabled days
    Object.entries(scheduleData.days).forEach(([dayKey, daySchedule]) => {
      if (daySchedule.enabled) {
        if (!daySchedule.timeRanges || daySchedule.timeRanges.length === 0) {
          newErrors.schedule = 'Please add at least one time range for all selected days'
        } else {
          // Check each time range
          daySchedule.timeRanges.forEach(range => {
            if (!range.startTime || !range.endTime) {
              newErrors.schedule = 'Please set start and end times for all time ranges'
            }
            if (range.startTime >= range.endTime) {
              newErrors.schedule = 'End time must be after start time for all time ranges'
            }
          })
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateStep3(): boolean {
    const newErrors: Record<string, string> = {}

    // Only validate if recurrence is enabled
    if (recurrenceConfig.isRecurring) {
      const validationError = validateRecurrenceConfig(recurrenceConfig)
      if (validationError) {
        newErrors.recurrence = validationError
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2)
        setErrors({})
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3)
        setErrors({})
      }
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  async function handleSubmit() {
    if (!validateStep3()) {
      return
    }

    setSubmitting(true)
    try {
      // Calculate final values
      const durationMinutes = duration === 'custom' ? parseInt(customDuration) : parseInt(duration)

      // Prepare common data
      const commonData = {
        title,
        description: description || null,
        duration_minutes: durationMinutes,
        meeting_type: meetingType,
        meeting_config: {
          requiresGeneration: meetingType === 'zoom' || meetingType === 'google_meet',
          manualValue: meetingValue || null,
        },
      }

      // Use patterns API endpoint
      const url = patternId
        ? `/api/availability/patterns/${patternId}`
        : '/api/availability/patterns'

      // Prepare recurrence data if enabled
      const recurrenceData = recurrenceConfig.isRecurring ? {
        is_recurring: true,
        recurrence_type: recurrenceConfig.type,
        recurrence_interval: recurrenceConfig.interval,
        recurrence_days_of_week: recurrenceConfig.type === 'weekly' ? recurrenceConfig.daysOfWeek : null,
        recurrence_day_of_month: recurrenceConfig.type === 'monthly' ? recurrenceConfig.dayOfMonth : null,
        recurrence_end_type: recurrenceConfig.endType,
        recurrence_count: recurrenceConfig.endType === 'count' ? recurrenceConfig.count : null,
        recurrence_end_date: recurrenceConfig.endType === 'date' ? recurrenceConfig.endDate : null,
      } : {
        is_recurring: false,
      }

      const response = await fetch(url, {
        method: patternId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commonData,
          scheduleData,
          recurrenceData,
          timezone: getUserTimezone(), // Save admin's timezone to prevent booking conflicts
          companyId
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${patternId ? 'update' : 'create'} availability pattern`)
      }

      // Reset form
      resetForm()
      onSuccess()
      onClose()
    } catch (error) {
      showError('Failed to create availability pattern', 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setCurrentStep(1)
    setTitle('')
    setDescription('')
    setDuration('30')
    setCustomDuration('')
    setMeetingType('zoom')
    setMeetingValue('')
    setScheduleData({
      days: {},
      dateRange: {
        start: new Date(),
        end: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // Default 4 weeks
        indefinite: false,
      },
    })
    setRecurrenceConfig({
      isRecurring: false,
      type: 'weekly' as RecurrenceType,
      interval: 1,
      daysOfWeek: [] as string[],
      dayOfMonth: 1,
      endType: 'count' as RecurrenceEndType,
      count: 10,
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    setErrors({})
  }

  async function handleClose() {
    // If editing, check if changes were made
    if (patternId && editData) {
      // Compare current form values with original edit data
      const durationChanged = (duration === 'custom' ? customDuration : duration) !== editData.duration_minutes.toString()

      const hasChanges =
        title !== editData.title ||
        description !== (editData.description || '') ||
        durationChanged ||
        meetingType !== (editData.meeting_type || 'zoom')

      if (hasChanges) {
        const confirmed = await confirm.confirm({
          title: 'Discard Changes?',
          message: 'Are you sure you want to close? Your changes will be lost.',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
          variant: 'warning',
        })
        if (confirmed) {
          resetForm()
          onClose()
        }
      } else {
        // No changes made, just close
        onClose()
      }
    } else {
      // Creating new pattern - check if any form data has been entered
      const hasScheduleData = Object.values(scheduleData.days).some(
        day => day.enabled && day.timeRanges && day.timeRanges.length > 0
      )

      if (currentStep > 1 || title || description || hasScheduleData) {
        const confirmed = await confirm.confirm({
          title: 'Discard Progress?',
          message: 'Are you sure you want to close? Your progress will be lost.',
          confirmText: 'Discard',
          cancelText: 'Continue',
          variant: 'warning',
        })
        if (confirmed) {
          resetForm()
          onClose()
        }
      } else {
        onClose()
      }
    }
  }

  return (
    <Drawer open={isOpen} onClose={handleClose} width="lg">
      <DrawerHeader title={patternId ? "Edit Availability" : "Create Availability"} onClose={handleClose} />

      {/* Content */}
      <DrawerContent>
        {loading ? (
          <SkeletonLoader />
        ) : (
          <>
            {/* Step 1: Time Slot Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Connected Account Badge */}
                <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                  <User className="w-5 h-5 text-zinc-400" />
                  <div className="flex-1">
                    <span className="text-sm text-zinc-300">{connectedEmail}</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    HOST
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-100">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`input w-full ${errors.title ? 'border-red-500' : ''}`}
                    placeholder="e.g., 30 Min Coaching Call with John"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-400">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-100">
                    Description <span className="text-zinc-500">(Optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input w-full min-h-[100px]"
                    placeholder="We will discuss your business and..."
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-100">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <SegmentedControl
                    options={DURATION_OPTIONS}
                    value={duration}
                    onChange={setDuration}
                    allowCustom
                    customValue={customDuration}
                    onCustomChange={setCustomDuration}
                    customPlaceholder="Enter minutes"
                    customUnit="minutes"
                    name="duration"
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-400">{errors.duration}</p>
                  )}
                </div>

                {/* Meeting Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-100">
                    Meeting Link/Location <span className="text-red-500">*</span>
                  </label>
                  <ConditionalSelect
                    value={meetingType}
                    onChange={setMeetingType}
                    conditionalValue={meetingValue}
                    onConditionalChange={setMeetingValue}
                    companyId={companyId}
                  />
                  {errors.meeting && (
                    <p className="text-sm text-red-400">{errors.meeting}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Select Your Availability
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Check the days you're available and set your time range for each day
                  </p>
                </div>

                <SimplifiedSchedulePicker
                  value={scheduleData}
                  onChange={setScheduleData}
                  error={errors.schedule}
                />

                {/* Slots Preview */}
                <SlotsPreviewCount
                  scheduleData={scheduleData}
                  duration={duration === 'custom' ? parseInt(customDuration) || 30 : parseInt(duration)}
                />
              </div>
            )}

            {/* Step 3: Recurrence */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Recurring Bookings
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Configure if this availability pattern should create recurring bookings
                  </p>
                </div>

                <RecurrenceConfigPanel
                  config={recurrenceConfig}
                  onChange={setRecurrenceConfig}
                  error={errors.recurrence}
                />
              </div>
            )}
          </>
        )}
      </DrawerContent>

      {/* Footer */}
      {!loading && (
        <DrawerFooter>
          <div className="flex items-center justify-between gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <div className="flex-1" />

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-2 px-8"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 px-8 min-w-[200px]"
              >
                {submitting ? (
                  patternId ? 'Updating...' : 'Creating...'
                ) : (
                  <>
                    {patternId ? 'Update Availability' : 'Create Availability'}
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </DrawerFooter>
      )}
    </Drawer>
  )
}
