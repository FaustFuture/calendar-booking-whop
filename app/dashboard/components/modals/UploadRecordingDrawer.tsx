'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'
import { useToast } from '@/lib/context/ToastContext'
import { Recording } from '@/lib/types/database'

const recordingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  url: z.string().url('Must be a valid URL'),
  booking_id: z.string().uuid('Please select a booking').optional(),
})

type RecordingFormData = z.infer<typeof recordingSchema>

// Helper to detect and convert video URLs to embeddable format
function getEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.hostname.includes('youtu.be')
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get('v')
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').filter(Boolean)[0]
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`
      }
    }

    // Return original URL for direct video links or other platforms
    return url
  } catch {
    return url
  }
}

interface UploadRecordingDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companyId: string
  bookingId?: string // Optional pre-selected booking (will be auto-filled in form)
  recording?: Recording // Optional recording for edit mode
}

export default function UploadRecordingDrawer({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  bookingId,
  recording,
}: UploadRecordingDrawerProps) {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(false)
  const isEditMode = !!recording

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RecordingFormData>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      title: recording?.title || '',
      url: recording?.url || '',
      booking_id: recording?.booking_id || bookingId,
    },
  })

  // Update form when bookingId or recording changes
  useEffect(() => {
    if (recording) {
      setValue('title', recording.title)
      setValue('url', recording.url)
      setValue('booking_id', recording.booking_id || bookingId)
    } else if (bookingId) {
      setValue('booking_id', bookingId)
    }
  }, [bookingId, recording, setValue])

  async function onSubmit(data: RecordingFormData) {
    setLoading(true)
    try {
      const embedUrl = getEmbedUrl(data.url)

      // Use booking_id from form or from props
      const finalBookingId = data.booking_id || bookingId

      if (isEditMode && recording) {
        // Update existing recording
        const updateData: any = {
          title: data.title,
          url: data.url,
          playback_url: embedUrl,
          companyId, // Required for API route
        }

        const response = await fetch(`/api/recordings/${recording.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update recording')
        }

        showSuccess('Recording Updated', 'The recording has been successfully updated.')
      } else {
        // Create new recording
        const recordingData: any = {
          title: data.title,
          url: data.url,
          playback_url: embedUrl, // Store embeddable version
          provider: 'manual',
          status: 'available',
          recording_type: 'cloud',
          auto_fetched: false,
          companyId, // Required for API route
        }

        // Add booking_id if provided
        if (finalBookingId) {
          recordingData.booking_id = finalBookingId
        }

        const response = await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordingData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to upload recording')
        }

        showSuccess('Recording Uploaded', 'The recording has been successfully uploaded.')
      }

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving recording:', error)
      showError(
        isEditMode ? 'Update Failed' : 'Upload Failed',
        error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'upload'} recording. Please try again.`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={isOpen} onClose={onClose} width="md">
      <DrawerHeader
        title={isEditMode ? 'Edit Recording' : 'Upload Recording'}
        onClose={onClose}
      />

      <DrawerContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="upload-recording-form">
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
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {errors.url && (
              <p className="text-red-400 text-sm mt-1">{errors.url.message}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1.5">
              Supports: YouTube, Vimeo, or direct video URLs (.mp4, .webm)
            </p>
          </div>

        </form>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex gap-3 w-full">
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
            form="upload-recording-form"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? (isEditMode ? 'Updating...' : 'Uploading...') : (isEditMode ? 'Update Recording' : 'Upload Recording')}
          </button>
        </div>
      </DrawerFooter>
    </Drawer>
  )
}
