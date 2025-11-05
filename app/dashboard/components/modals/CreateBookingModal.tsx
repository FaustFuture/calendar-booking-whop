'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const bookingSchema = z.object({
  member_id: z.string().uuid('Please select a member'),
  admin_id: z.string().uuid('Admin ID is required'),
  slot_id: z.string().uuid('Please select a time slot').optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  meeting_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  adminId: string
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
  adminId,
}: CreateBookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [slots, setSlots] = useState<Array<{ id: string; start_time: string; end_time: string }>>([])
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      admin_id: adminId,
    },
  })

  // Load members and available slots when modal opens
  useState(() => {
    if (isOpen) {
      loadData()
    }
  })

  async function loadData() {
    // Load members
    const { data: membersData } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'member')
      .order('name')

    setMembers(membersData || [])

    // Load available slots
    const { data: slotsData } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time')
      .eq('is_available', true)
      .eq('admin_id', adminId)
      .order('start_time')

    setSlots(slotsData || [])
  }

  async function onSubmit(data: BookingFormData) {
    setLoading(true)
    try {
      const { error } = await supabase.from('bookings').insert({
        ...data,
        status: 'upcoming',
      })

      if (error) throw error

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Booking</h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Member *
            </label>
            <select {...register('member_id')} className="input w-full">
              <option value="">Select a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
            {errors.member_id && (
              <p className="text-red-400 text-sm mt-1">{errors.member_id.message}</p>
            )}
          </div>

          {/* Time Slot Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Time Slot (Optional)
            </label>
            <select {...register('slot_id')} className="input w-full">
              <option value="">No specific time slot</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleTimeString()}
                </option>
              ))}
            </select>
            {errors.slot_id && (
              <p className="text-red-400 text-sm mt-1">{errors.slot_id.message}</p>
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

          {/* Meeting URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Meeting URL
            </label>
            <input
              type="url"
              {...register('meeting_url')}
              className="input w-full"
              placeholder="https://zoom.us/j/..."
            />
            {errors.meeting_url && (
              <p className="text-red-400 text-sm mt-1">{errors.meeting_url.message}</p>
            )}
          </div>

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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
        </form>
      </div>
    </div>
  )
}
