'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from '../shared/Drawer'
import { useToast } from '@/lib/context/ToastContext'

const bookingSchema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  meeting_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
})

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
  const { showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  })

  // Load members when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMembers()
    }
  }, [isOpen])

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

  async function onSubmit(data: BookingFormData) {
    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId,
          status: 'upcoming',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      showError('Booking Failed', error instanceof Error ? error.message : 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Drawer open={isOpen} onClose={onClose} width="lg">
      <DrawerHeader title="Create Booking" onClose={onClose} />

      <DrawerContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        </form>
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
            onClick={handleSubmit(onSubmit)}
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </DrawerFooter>
    </Drawer>
  )
}
