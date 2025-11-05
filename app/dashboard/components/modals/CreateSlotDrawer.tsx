'use client'

import { useState, useEffect } from 'react'
import { User, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from '../shared/Drawer'
import WizardStepper from '../shared/WizardStepper'
import SegmentedControl, { SegmentOption } from '../shared/SegmentedControl'
import ConditionalSelect, { MeetingType } from '../shared/ConditionalSelect'
import SchedulePicker, { ScheduleData } from '../shared/SchedulePicker/SchedulePicker'
import SkeletonLoader from '../shared/SkeletonLoader'

interface CreateSlotDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  adminId: string
}

const DURATION_OPTIONS: SegmentOption[] = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
]

const PRICE_OPTIONS: SegmentOption[] = [
  { value: 'free', label: 'Free' },
  { value: '50', label: '$50' },
  { value: '100', label: '$100' },
  { value: '150', label: '$150' },
]

export default function CreateSlotDrawer({
  isOpen,
  onClose,
  onSuccess,
  adminId,
}: CreateSlotDrawerProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [customDuration, setCustomDuration] = useState('')
  const [price, setPrice] = useState('free')
  const [customPrice, setCustomPrice] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('google_meet')
  const [meetingValue, setMeetingValue] = useState('')
  const [connectedEmail, setConnectedEmail] = useState('')
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    mode: 'recurring',
    dateRange: {
      start: new Date(),
      end: null,
      indefinite: true,
    },
    recurringDays: [],
    recurringTimes: [],
    specificDates: [],
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Schedule' },
  ]

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadUserData()
    }
  }, [isOpen])

  async function loadUserData() {
    try {
      // Handle dev mode when adminId is a placeholder
      if (adminId === '00000000-0000-0000-0000-000000000001') {
        setConnectedEmail('admin@dev.local (Development Mode)')
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', adminId)
        .single()

      setConnectedEmail(userData?.email || 'admin@example.com')
    } catch (error) {
      console.error('Error loading user data:', error)
      setConnectedEmail('admin@example.com')
    } finally {
      setLoading(false)
    }
  }

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

    if (price === 'custom' && (!customPrice || parseFloat(customPrice) < 0)) {
      newErrors.price = 'Please enter a valid price'
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

    if (scheduleData.mode === 'recurring') {
      if (scheduleData.recurringDays.length === 0 || scheduleData.recurringTimes.length === 0) {
        newErrors.schedule = 'Please select at least one day and one time slot'
      }
    } else {
      const hasValidDates = scheduleData.specificDates.length > 0 &&
        scheduleData.specificDates.some(d => d.times.length > 0)
      if (!hasValidDates) {
        newErrors.schedule = 'Please add at least one date with time slots'
      }
    }

    // Validate date range if not indefinite
    if (!scheduleData.dateRange.indefinite) {
      if (!scheduleData.dateRange.start) {
        newErrors.dateRange = 'Please select a start date'
      }
      if (!scheduleData.dateRange.end) {
        newErrors.dateRange = 'Please select an end date'
      }
      if (scheduleData.dateRange.start && scheduleData.dateRange.end &&
          scheduleData.dateRange.start > scheduleData.dateRange.end) {
        newErrors.dateRange = 'End date must be after start date'
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
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  async function handleSubmit() {
    if (!validateStep2()) {
      return
    }

    setSubmitting(true)
    try {
      // Calculate final duration
      const finalDuration = duration === 'custom' ? parseInt(customDuration) : parseInt(duration)

      // Calculate final price
      let finalPrice = 0
      if (price !== 'free') {
        finalPrice = price === 'custom' ? parseFloat(customPrice) : parseFloat(price)
      }

      // Determine meeting link
      let finalMeetingLink = ''
      if (meetingType === 'google_meet') {
        finalMeetingLink = 'GOOGLE_MEET_AUTO' // Placeholder for auto-generation
      } else if (meetingType === 'zoom') {
        finalMeetingLink = 'ZOOM_AUTO' // Placeholder for auto-generation
      } else {
        finalMeetingLink = meetingValue
      }

      const slotsToCreate: any[] = []

      if (scheduleData.mode === 'recurring') {
        // Generate slots for recurring schedule
        const dayMap: Record<string, number> = {
          Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
        }

        // Calculate date range
        const startDate = scheduleData.dateRange.start || new Date()
        const endDate = scheduleData.dateRange.indefinite
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Default 90 days
          : scheduleData.dateRange.end!

        // Generate slots for each day/time combination within the range
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dayName = Object.keys(dayMap).find(
            key => dayMap[key] === currentDate.getDay()
          )

          if (dayName && scheduleData.recurringDays.includes(dayName)) {
            // Create slots for each selected time on this day
            scheduleData.recurringTimes.forEach(time => {
              const [hour, minute] = time.split(':').map(Number)
              const slotDate = new Date(currentDate)
              slotDate.setHours(hour, minute, 0, 0)

              const endSlotDate = new Date(slotDate)
              endSlotDate.setMinutes(endSlotDate.getMinutes() + finalDuration)

              slotsToCreate.push({
                admin_id: adminId,
                title,
                description: description || null,
                start_time: slotDate.toISOString(),
                end_time: endSlotDate.toISOString(),
                is_available: true,
              })
            })
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        // Generate slots for specific dates
        scheduleData.specificDates.forEach(dateItem => {
          dateItem.times.forEach(time => {
            const [hour, minute] = time.split(':').map(Number)
            const slotDate = new Date(dateItem.date + 'T00:00:00')
            slotDate.setHours(hour, minute, 0, 0)

            const endSlotDate = new Date(slotDate)
            endSlotDate.setMinutes(endSlotDate.getMinutes() + finalDuration)

            slotsToCreate.push({
              admin_id: adminId,
              title,
              description: description || null,
              start_time: slotDate.toISOString(),
              end_time: endSlotDate.toISOString(),
              is_available: true,
            })
          })
        })
      }

      if (slotsToCreate.length === 0) {
        alert('No slots to create. Please check your schedule selection.')
        return
      }

      // Insert all slots
      const { error } = await supabase
        .from('availability_slots')
        .insert(slotsToCreate)

      if (error) throw error

      // Reset form
      resetForm()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating time slots:', error)
      alert('Failed to create time slots. Please try again.')
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
    setPrice('free')
    setCustomPrice('')
    setMeetingType('google_meet')
    setMeetingValue('')
    setScheduleData({
      mode: 'recurring',
      dateRange: {
        start: new Date(),
        end: null,
        indefinite: true,
      },
      recurringDays: [],
      recurringTimes: [],
      specificDates: [],
    })
    setErrors({})
  }

  function handleClose() {
    const hasScheduleData = scheduleData.recurringDays.length > 0 ||
      scheduleData.recurringTimes.length > 0 ||
      scheduleData.specificDates.length > 0

    if (currentStep > 1 || title || description || hasScheduleData) {
      if (confirm('Are you sure you want to close? Your progress will be lost.')) {
        resetForm()
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <Drawer open={isOpen} onClose={handleClose} width="lg">
      {/* Header with Stepper */}
      <DrawerHeader title="Create Time Slot" onClose={handleClose}>
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isActive = stepNumber === currentStep

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      text-sm font-semibold transition-all
                      ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                      ${isActive ? 'bg-emerald-500 text-white' : ''}
                      ${!isCompleted && !isActive ? 'bg-zinc-800 text-zinc-500' : ''}
                    `}
                  >
                    {stepNumber}
                  </div>
                  <span
                    className={`
                      text-xs font-medium
                      ${isActive ? 'text-emerald-400' : ''}
                      ${isCompleted ? 'text-zinc-300' : ''}
                      ${!isCompleted && !isActive ? 'text-zinc-500' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mb-5 transition-all">
                    <div
                      className={`
                        h-full transition-all duration-300
                        ${stepNumber < currentStep ? 'bg-emerald-500' : 'bg-zinc-700'}
                      `}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </DrawerHeader>

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

                {/* Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-100">
                    Price per booking <span className="text-zinc-500">(Optional)</span>
                  </label>
                  <SegmentedControl
                    options={PRICE_OPTIONS}
                    value={price}
                    onChange={setPrice}
                    allowCustom
                    customValue={customPrice}
                    onCustomChange={setCustomPrice}
                    customPlaceholder="Enter amount"
                    customUnit="USD"
                    name="price"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-400">{errors.price}</p>
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
                    Choose when you're available for bookings - select recurring weekly patterns or specific dates
                  </p>
                </div>

                <SchedulePicker
                  value={scheduleData}
                  onChange={setScheduleData}
                  error={errors.dateRange || errors.schedule}
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
                  'Creating...'
                ) : (
                  <>
                    Create Time Slot
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
