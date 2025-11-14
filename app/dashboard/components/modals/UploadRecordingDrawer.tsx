'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Upload as UploadIcon } from 'lucide-react'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'
import { useToast } from '@/lib/context/ToastContext'
import { Recording } from '@/lib/types/database'

const recordingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  url: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional(),
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
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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
      // If recording has a URL, assume it was uploaded via link
      setUploadType(recording.url ? 'link' : 'file')
    } else if (bookingId) {
      setValue('booking_id', bookingId)
    }
  }, [bookingId, recording, setValue])

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setUploadType('link')
      setSelectedFile(null)
    }
  }, [isOpen, reset])

  async function onSubmit(data: RecordingFormData) {
    setLoading(true)
    try {
      // Use booking_id from form or from props
      const finalBookingId = data.booking_id || bookingId

      // Validate that either URL or file is provided
      if (uploadType === 'link' && !data.url) {
        showError('Validation Error', 'Please provide a recording URL')
        setLoading(false)
        return
      }

      if (uploadType === 'file' && !selectedFile) {
        showError('Validation Error', 'Please select a video file to upload')
        setLoading(false)
        return
      }

      if (isEditMode && recording) {
        // Update existing recording (only supports link for now)
        if (!data.url) {
          showError('Validation Error', 'Please provide a recording URL')
          setLoading(false)
          return
        }

        const embedUrl = getEmbedUrl(data.url)
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
        if (uploadType === 'file' && selectedFile) {
          // Step 1: Get upload path from server (no file sent, avoids body size limit)
          const initResponse = await fetch('/api/recordings/upload/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              bookingId: finalBookingId,
              title: data.title,
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              fileType: selectedFile.type,
            }),
          })

          if (!initResponse.ok) {
            const error = await initResponse.json()
            throw new Error(error.error || 'Failed to initialize upload')
          }

          const { filePath } = await initResponse.json()

          // Step 2: Upload file directly to Supabase Storage from client
          // Note: The recordings bucket must be public or have RLS policies that allow uploads
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()

          const { error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(filePath, selectedFile, {
              contentType: selectedFile.type || 'video/mp4',
              upsert: false,
            })

          if (uploadError) {
            // If RLS error, provide helpful message
            if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
              throw new Error('Storage permission denied. Please ensure the "recordings" bucket allows public uploads or configure RLS policies correctly.')
            }
            throw new Error(`Upload failed: ${uploadError.message}`)
          }

          // Step 3: Save metadata via API
          const completeResponse = await fetch('/api/recordings/upload/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              bookingId: finalBookingId,
              title: data.title,
              filePath,
              fileSize: selectedFile.size,
            }),
          })

          if (!completeResponse.ok) {
            // Try to delete uploaded file if metadata save fails
            await supabase.storage.from('recordings').remove([filePath])
            const error = await completeResponse.json()
            throw new Error(error.error || 'Failed to save recording metadata')
          }

          showSuccess('Recording Uploaded', 'The recording has been successfully uploaded.')
        } else if (uploadType === 'link' && data.url) {
          // Create recording with link
          const embedUrl = getEmbedUrl(data.url)
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
      }

      reset()
      setSelectedFile(null)
      setUploadType('link')
      onSuccess()
      onClose()
    } catch (error) {
      showError(
        isEditMode ? 'Update Failed' : 'Upload Failed',
        error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'upload'} recording. Please try again.`
      )
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
      ]
      const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        showError('Invalid File Type', 'Please select a video file (MP4, WebM, MOV, AVI, or MKV)')
        return
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024
      if (file.size > maxSize) {
        showError('File Too Large', 'File size must be less than 500MB')
        return
      }

      setSelectedFile(file)
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

          {/* Upload Type Selection */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Upload Method *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadType('link')
                    setSelectedFile(null)
                    setValue('url', '')
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    uploadType === 'link'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadType('file')
                    setValue('url', '')
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    uploadType === 'file'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </div>
          )}

          {/* URL Input (for link method) */}
          {uploadType === 'link' && (
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
          )}

          {/* File Upload (for file method) */}
          {uploadType === 'file' && !isEditMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Video File *
              </label>
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadIcon className="w-8 h-8 mb-2 text-zinc-400" />
                    <p className="mb-2 text-sm text-zinc-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500">MP4, WebM, MOV, AVI, or MKV (MAX. 500MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv"
                    onChange={handleFileSelect}
                  />
                </label>
                {selectedFile && (
                  <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UploadIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-zinc-300">{selectedFile.name}</span>
                        <span className="text-xs text-zinc-500">
                          ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-zinc-500 hover:text-zinc-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
