'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'

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

interface UploadRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookingId?: string // Optional pre-selected booking
}

export default function UploadRecordingModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
}: UploadRecordingModalProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecordingFormData>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      booking_id: bookingId,
    },
  })

  async function onSubmit(data: RecordingFormData) {
    setLoading(true)
    try {
      const embedUrl = getEmbedUrl(data.url)

      // Get or create a general recording entry (not tied to specific booking)
      const recordingData: any = {
        title: data.title,
        url: data.url,
        playback_url: embedUrl, // Store embeddable version
        provider: 'manual',
        status: 'available',
        recording_type: 'cloud',
        auto_fetched: false,
      }

      // Add booking_id if provided (it's optional now)
      if (data.booking_id) {
        recordingData.booking_id = data.booking_id
      }

      const { error } = await supabase.from('recordings').insert(recordingData)

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

  return (
    <Drawer open={isOpen} onClose={onClose} width="md">
      <DrawerHeader
        title="Upload Recording"
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
            {loading ? 'Uploading...' : 'Upload Recording'}
          </button>
        </div>
      </DrawerFooter>
    </Drawer>
  )
}
