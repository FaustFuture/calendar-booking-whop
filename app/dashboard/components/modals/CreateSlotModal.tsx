'use client'

import { useState, useEffect } from 'react'
import { X, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WizardStepper from '../shared/WizardStepper'
import SegmentedControl, { SegmentOption } from '../shared/SegmentedControl'
import ConditionalSelect, { MeetingType } from '../shared/ConditionalSelect'
import WeeklyScheduleGrid from '../shared/WeeklyScheduleGrid'
import SkeletonLoader from '../shared/SkeletonLoader'

interface CreateSlotModalProps {
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

export default function CreateSlotModal({
  isOpen,
  onClose,
  onSuccess,
  adminId,
}: CreateSlotModalProps) {
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
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = [
    { number: 1, label: 'Time Slot Details' },
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

    if (selectedSlots.length === 0) {
      newErrors.schedule = 'Please select at least one time slot'
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

      // Create availability slots for each selected time
      const slotsToCreate = selectedSlots.map((slot) => {
        const [day, hour] = slot.split('-')

        // For now, we'll create slots for the next occurrence of this day/hour
        // In production, you'd calculate actual dates based on a date range
        const now = new Date()
        const slotDate = new Date(now)
        slotDate.setHours(parseInt(hour), 0, 0, 0)

        const endDate = new Date(slotDate)
        endDate.setMinutes(finalDuration)

        return {
          admin_id: adminId,
          title,
          description: description || null,
          start_time: slotDate.toISOString(),
          end_time: endDate.toISOString(),
          is_available: true,
          // Store additional metadata (we'll need to extend the schema later)
        }
      })

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
    setSelectedSlots([])
    setErrors({})
  }

  function handleClose() {
    if (currentStep > 1 || title || description || selectedSlots.length > 0) {
      if (confirm('Are you sure you want to close? Your progress will be lost.')) {
        resetForm()
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Time Slot</h2>
          <button onClick={handleClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper */}
        <WizardStepper currentStep={currentStep} steps={steps} />

        {/* Form Content */}
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
                    Choose the days and times when you're available for bookings
                  </p>
                </div>

                <WeeklyScheduleGrid
                  selectedSlots={selectedSlots}
                  onSlotsChange={setSelectedSlots}
                />

                {errors.schedule && (
                  <p className="text-sm text-red-400">{errors.schedule}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Navigation Footer */}
        {!loading && (
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-zinc-700">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary min-w-[180px]"
              >
                {submitting ? 'Creating...' : 'Create Time Slot'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
