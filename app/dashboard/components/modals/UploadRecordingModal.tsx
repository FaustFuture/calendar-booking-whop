'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const recordingSchema = z.object({
  booking_id: z.string().uuid('Please select a booking'),
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required').max(200),
  duration: z.number().positive('Duration must be positive').optional(),
  file_size: z.number().positive('File size must be positive').optional(),
})

type RecordingFormData = z.infer<typeof recordingSchema>

interface UploadRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UploadRecordingModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadRecordingModalProps) {
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState<Array<{ id: string; title: string; member_name: string }>>([])
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecordingFormData>({
    resolver: zodResolver(recordingSchema),
  })

  // Load completed bookings when modal opens
  useState(() => {
    if (isOpen) {
      loadBookings()
    }
  })

  async function loadBookings() {
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id,
        title,
        member:member_id(name)
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    const formatted = bookingsData?.map((b: any) => ({
      id: b.id,
      title: b.title,
      member_name: b.member?.name || 'Unknown',
    }))

    setBookings(formatted || [])
  }

  async function onSubmit(data: RecordingFormData) {
    setLoading(true)
    try {
      const { error } = await supabase.from('recordings').insert({
        ...data,
        duration: data.duration ? Number(data.duration) : undefined,
        file_size: data.file_size ? Number(data.file_size) : undefined,
      })

      if (error) throw error

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error uploading recording:', error)
      alert('Failed to upload recording. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Upload Recording</h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Booking Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Booking *
            </label>
            <select {...register('booking_id')} className="input w-full">
              <option value="">Select a booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.title} - {booking.member_name}
                </option>
              ))}
            </select>
            {errors.booking_id && (
              <p className="text-red-400 text-sm mt-1">{errors.booking_id.message}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Recording Title *
            </label>
            <input
              type="text"
              {...register('title')}
              className="input w-full"
              placeholder="e.g., Strategy Session Recording"
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Recording URL *
            </label>
            <input
              type="url"
              {...register('url')}
              className="input w-full"
              placeholder="https://..."
            />
            {errors.url && (
              <p className="text-red-400 text-sm mt-1">{errors.url.message}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              Link to video file (e.g., Vimeo, YouTube, or direct video URL)
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              {...register('duration', { valueAsNumber: true })}
              className="input w-full"
              placeholder="e.g., 3600 for 1 hour"
            />
            {errors.duration && (
              <p className="text-red-400 text-sm mt-1">{errors.duration.message}</p>
            )}
          </div>

          {/* File Size */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              File Size (bytes)
            </label>
            <input
              type="number"
              {...register('file_size', { valueAsNumber: true })}
              className="input w-full"
              placeholder="e.g., 104857600 for 100MB"
            />
            {errors.file_size && (
              <p className="text-red-400 text-sm mt-1">{errors.file_size.message}</p>
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
              {loading ? 'Uploading...' : 'Upload Recording'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
