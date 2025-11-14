'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Calendar, User as UserIcon, CheckCircle, ExternalLink, Copy, Check, Trash2, Video, Upload, Clock, Link as LinkIcon, MapPin, Play, Edit, X, File } from 'lucide-react'
import { BookingWithRelations, Recording, RecordingProvider, RecordingStatus } from '@/lib/types/database'
import { format } from 'date-fns'
import { BookingSkeleton } from '../shared/ListItemSkeleton'
import { useWhopUser } from '@/lib/context/WhopUserContext'
import { useToast } from '@/lib/context/ToastContext'
import { useConfirm } from '@/lib/context/ConfirmDialogContext'
import UploadRecordingDrawer from '../modals/UploadRecordingDrawer'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'
import { fetcher } from '@/lib/utils/fetcher'

interface PastTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
}

function PastTab({ roleOverride, companyId }: PastTabProps) {
  const { user } = useWhopUser()
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)

  // Use SWR to fetch bookings
  const { data, error, isLoading, mutate } = useSWR<{ bookings: BookingWithRelations[] }>(
    `/api/bookings?companyId=${companyId}&status=completed,cancelled`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const bookings = data?.bookings || []
  const loading = isLoading

  // Use SWR to fetch recordings (for all users)
  const { data: recordingsData, mutate: mutateRecordings } = useSWR<{ data: Recording[] }>(
    `/api/recordings?companyId=${companyId}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  // Calculate recordings count and group by booking
  const recordingsCount: Record<string, number> = {}
  const recordingsByBooking: Record<string, Recording[]> = {}
  if (recordingsData?.data && bookings.length > 0) {
    recordingsData.data.forEach((recording: Recording) => {
      if (recording.booking_id) {
        if (!recordingsByBooking[recording.booking_id]) {
          recordingsByBooking[recording.booking_id] = []
        }
        recordingsByBooking[recording.booking_id].push(recording)
        recordingsCount[recording.booking_id] = (recordingsCount[recording.booking_id] || 0) + 1
      }
    })
  }

  function handleUploadRecording(bookingId: string) {
    setSelectedBookingId(bookingId)
    setIsUploadModalOpen(true)
  }

  function handleUploadSuccess() {
    mutate() // Refresh bookings using SWR mutate
    mutateRecordings() // Refresh recordings count
  }

  async function copyMeetingLink(bookingId: string, meetingUrl: string) {
    try {
      await navigator.clipboard.writeText(meetingUrl)
      setCopiedId(bookingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      // Error copying link
    }
  }

  async function deleteBooking(bookingId: string) {
    const confirmed = await confirm.confirm({
      title: 'Delete Booking',
      message: 'Are you sure you want to delete this booking? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}?companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showSuccess('Booking deleted', 'The booking has been successfully deleted.')
        // Reload bookings using SWR mutate
        mutate()
      } else {
        const error = await response.json()
        showError('Failed to delete booking', error.error || 'An error occurred while deleting the booking.')
      }
    } catch (error) {
      showError('Failed to delete booking', 'Please try again.')
    }
  }

  // Show error if fetch failed (only once)
  useEffect(() => {
    if (error) {
      showError('Failed to load bookings', error.message || 'Please try again.')
    }
  }, [error, showError])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-700 rounded w-64" />
          <div className="h-5 bg-zinc-700 rounded w-96" />
        </div>
        {/* Bookings skeleton */}
        <div className="grid gap-4">
          <BookingSkeleton />
          <BookingSkeleton />
          <BookingSkeleton />
        </div>
      </div>
    )
  }

  const isAdmin = roleOverride === 'admin'
  
  // Check if a booking belongs to the current user (for members)
  const isBookingOwner = (booking: BookingWithRelations) => {
    if (isAdmin) return true // Admins can delete any booking
    if (!user) return false
    return booking.member_id === user.userId
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Past Bookings</h2>
        <p className="text-zinc-400 mt-1">
          {isAdmin
            ? 'View all completed and cancelled bookings'
            : 'Your booking history'}
        </p>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No past bookings</p>
          <p className="text-zinc-500 text-sm mt-2">
            Completed bookings will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <div 
              key={booking.id} 
              className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/30 transition-colors p-4 opacity-90 cursor-pointer"
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-2 bg-zinc-700/50 border border-zinc-700/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-zinc-500" />
                  </div>

                  {/* Content - 2 rows */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Title and Status */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">
                        {booking.title}
                      </h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'completed'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {booking.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                      {recordingsCount[booking.id] > 0 && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {recordingsCount[booking.id]}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Date, Time, and Person */}
                    {(booking.slot || booking.booking_start_time) && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>
                          {format(
                            new Date(booking.slot?.start_time || booking.booking_start_time!),
                            'MMM d, yyyy'
                          )}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span>
                          {format(
                            new Date(booking.slot?.start_time || booking.booking_start_time!),
                            'h:mm a'
                          )}
                        </span>
                        {isAdmin && booking.member && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="truncate">{booking.member.name}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isBookingOwner(booking) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBooking(booking.id)
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/delete"
                      title="Delete booking"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-400 group-hover/delete:text-red-400 transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Recording Drawer */}
      {isAdmin && (
        <UploadRecordingDrawer
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false)
            setSelectedBookingId(null)
          }}
          onSuccess={handleUploadSuccess}
          companyId={companyId}
          bookingId={selectedBookingId || undefined}
        />
      )}

      {/* Booking Details Drawer */}
      {selectedBooking && (
        <BookingDetailsDrawer
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          isAdmin={isAdmin}
          companyId={companyId}
          recordings={recordingsByBooking[selectedBooking.id] || []}
          onRecordingsUpdate={mutateRecordings}
        />
      )}
    </div>
  )
}

// Booking Details Drawer Component
interface BookingDetailsDrawerProps {
  booking: BookingWithRelations
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
  companyId: string
  recordings: Recording[]
  onRecordingsUpdate: () => void
}

function BookingDetailsDrawer({ booking, isOpen, onClose, isAdmin, companyId, recordings, onRecordingsUpdate }: BookingDetailsDrawerProps) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [selectedRecordingForPlayback, setSelectedRecordingForPlayback] = useState<Recording | null>(null)

  const startTime = booking.slot?.start_time || booking.booking_start_time
  const endTime = booking.slot?.end_time || booking.booking_end_time
  const meetingType = booking.slot?.meeting_type || booking.pattern?.meeting_type
  
  function getMeetingTypeDisplay(meetingType?: string) {
    switch (meetingType) {
      case 'zoom':
        return { icon: Video, label: 'Zoom', color: 'text-blue-600' }
      case 'manual_link':
        return { icon: LinkIcon, label: 'Custom Link', color: 'text-purple-400' }
      case 'location':
        return { icon: MapPin, label: 'In Person', color: 'text-green-400' }
      default:
        return { icon: Video, label: 'Meeting', color: 'text-zinc-400' }
    }
  }
  
  const meetingDisplay = getMeetingTypeDisplay(meetingType)
  const MeetingIcon = meetingDisplay.icon

  async function copyMeetingLink(bookingId: string, meetingUrl: string) {
    try {
      await navigator.clipboard.writeText(meetingUrl)
      setCopiedId(bookingId)
      showSuccess('Link copied', 'Meeting link copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      // Error copying link
    }
  }

  function formatDuration(start: string, end: string) {
    if (!start || !end) return 'N/A'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    return `${minutes} min`
  }

  function formatRecordingDuration(seconds?: number) {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  function getProviderBadge(provider: RecordingProvider) {
    const badges: Record<RecordingProvider, { label: string; color: string }> = {
      zoom: { label: 'Zoom', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      manual: { label: 'Manual', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
      google: { label: 'Google Meet', color: 'bg-green-500/10 text-green-400 border-green-500/20' }, // Legacy support
    }
    const badge = badges[provider]
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  function getStatusBadge(status: RecordingStatus) {
    const badges = {
      processing: { label: 'Processing', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      available: { label: 'Available', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      failed: { label: 'Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      deleted: { label: 'Deleted', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    }
    const badge = badges[status]
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  function handleAddRecording() {
    setIsUploadModalOpen(true)
  }

  function handleEditRecording(recording: Recording) {
    setSelectedRecording(recording)
    setIsEditModalOpen(true)
  }

  async function handleDeleteRecording(recordingId: string) {
    const confirmed = await confirm.confirm({
      title: 'Delete Recording?',
      message: 'Are you sure you want to delete this recording? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        showSuccess('Recording Deleted', 'The recording has been deleted successfully.')
        onRecordingsUpdate()
      } else {
        const errorData = await response.json()
        showError('Delete Failed', errorData.error || 'Failed to delete the recording.')
      }
    } catch (error) {
      showError('Delete Failed', 'An error occurred while deleting the recording.')
    }
  }

  function handleRecordingSuccess() {
    onRecordingsUpdate()
    setIsUploadModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedRecording(null)
  }

  return (
    <Drawer open={isOpen} onClose={onClose} width="md">
      <DrawerHeader
        title={booking.title || booking.pattern?.title || booking.slot?.title || 'Booking Details'}
        onClose={onClose}
      />

      <DrawerContent>
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              booking.status === 'upcoming'
                ? 'bg-emerald-500/20 text-emerald-400'
                : booking.status === 'completed'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {booking.status === 'upcoming' ? 'Upcoming' : booking.status === 'completed' ? 'Completed' : 'Cancelled'}
            </span>
          </div>

          {/* Date and Time */}
          {startTime && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Date & Time</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-white font-medium">
                      {format(new Date(startTime), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">
                      {format(new Date(startTime), 'h:mm a')}
                      {endTime && ` - ${format(new Date(endTime), 'h:mm a')}`}
                    </span>
                  </div>
                  {endTime && (
                    <div className="text-sm text-zinc-400">
                      Duration: {formatDuration(startTime, endTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Meeting Type */}
          {meetingType && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Meeting Type</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <MeetingIcon className={`w-4 h-4 ${meetingDisplay.color}`} />
                  <span className={meetingDisplay.color}>{meetingDisplay.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* Member/Guest Information (Admin only) */}
          {isAdmin && (booking.member || booking.guest_name) && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">
                {booking.member ? 'Member' : 'Guest'} Information
              </h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-zinc-400" />
                    <span className="text-white">
                      {booking.member ? booking.member.name : booking.guest_name}
                    </span>
                  </div>
                  {(booking.member?.email || booking.guest_email) && (
                    <div className="text-sm text-zinc-400 ml-6">
                      {booking.member?.email || booking.guest_email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {booking.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Description</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <p className="text-zinc-300 whitespace-pre-wrap">{booking.description}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Notes</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <p className="text-zinc-300 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {booking.attachments && booking.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Attachments</h3>
              <div className="space-y-2">
                {booking.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{attachment.file_name}</p>
                        <p className="text-xs text-zinc-400">
                          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/bookings/attachments/${attachment.id}/download?companyId=${companyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting URL */}
          {booking.meeting_url && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Meeting Link</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <a
                    href={booking.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm truncate flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {booking.meeting_url}
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyMeetingLink(booking.id, booking.meeting_url!)
                    }}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Copy link"
                  >
                    {copiedId === booking.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pattern Information */}
          {booking.pattern && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Availability Pattern</h3>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <p className="text-white">{booking.pattern.title}</p>
                {booking.pattern.description && (
                  <p className="text-sm text-zinc-400 mt-1">{booking.pattern.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Recordings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Recordings</h3>
              {isAdmin && booking.status === 'completed' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddRecording()
                  }}
                  className="text-xs px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Add Recording
                </button>
              )}
            </div>
            {recordings.length > 0 ? (
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="flex-shrink-0 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <Video className="w-5 h-5 text-emerald-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Title */}
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-semibold text-white truncate">
                              {recording.title}
                            </h4>
                          </div>

                          {/* Row 2: Duration, Date */}
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            {recording.duration && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatRecordingDuration(recording.duration)}
                                </span>
                                <span className="text-zinc-600">•</span>
                              </>
                            )}
                            <span>
                              {format(new Date(recording.uploaded_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isAdmin && (recording.playback_url || recording.url) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRecordingForPlayback(recording)
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                            title="Watch recording"
                          >
                            <Play className="w-4 h-4" />
                            Watch
                          </button>
                        )}
                        {/* <a
                          href={recording.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/btn"
                          title="Open in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-zinc-400 group-hover/btn:text-white transition-colors" />
                        </a> */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditRecording(recording)
                              }}
                              className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors group/btn"
                              title="Edit recording"
                            >
                              <Edit className="w-4 h-4 text-zinc-400 group-hover/btn:text-blue-400 transition-colors" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteRecording(recording.id)
                              }}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                              title="Delete recording"
                            >
                              <Trash2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-center">
                <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">No recordings available</p>
                {isAdmin && booking.status === 'completed' && (
                  <p className="text-zinc-500 text-xs mt-1">Click "Add Recording" to upload one</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>

      {/* Upload Recording Drawer */}
      {isAdmin && (
        <>
          <UploadRecordingDrawer
            isOpen={isUploadModalOpen}
            onClose={() => {
              setIsUploadModalOpen(false)
            }}
            onSuccess={handleRecordingSuccess}
            companyId={companyId}
            bookingId={booking.id}
          />
          <UploadRecordingDrawer
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedRecording(null)
            }}
            onSuccess={handleRecordingSuccess}
            companyId={companyId}
            bookingId={booking.id}
            recording={selectedRecording || undefined}
          />
        </>
      )}

      {/* Video Player Drawer */}
      {selectedRecordingForPlayback && (
        <Drawer open={!!selectedRecordingForPlayback} onClose={() => setSelectedRecordingForPlayback(null)} width="xl">
          <DrawerHeader
            title={selectedRecordingForPlayback.title}
            onClose={() => setSelectedRecordingForPlayback(null)}
          >
            {selectedRecordingForPlayback.duration && (
              <span className="text-sm text-zinc-400">
                {formatRecordingDuration(selectedRecordingForPlayback.duration)}
              </span>
            )}
          </DrawerHeader>

          <DrawerContent>
            {selectedRecordingForPlayback.playback_url ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={selectedRecordingForPlayback.playback_url}
                  className="absolute inset-0 w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No preview available</p>
                  <a
                    href={selectedRecordingForPlayback.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 text-sm hover:underline mt-2 inline-block"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-sm text-zinc-400">
                Recording for: <span className="text-white font-medium">{booking.title || booking.pattern?.title || booking.slot?.title || 'This booking'}</span>
              </div>
            </div>
          </DrawerContent>

          <DrawerFooter>
            <div className="flex gap-3 w-full">
              <a
                href={selectedRecordingForPlayback.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 flex-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open Link
              </a>
              <button
                onClick={() => setSelectedRecordingForPlayback(null)}
                className="btn-primary flex items-center justify-center gap-2 flex-1"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </DrawerFooter>
        </Drawer>
      )}

      <DrawerFooter>
        <div className="flex gap-3 w-full">
          {booking.meeting_url && (
            <a
              href={booking.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              {booking.status === 'completed' ? 'View Meeting' : 'Join Meeting'}
            </a>
          )}
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Close
          </button>
        </div>
      </DrawerFooter>
    </Drawer>
  )
}

export default PastTab
