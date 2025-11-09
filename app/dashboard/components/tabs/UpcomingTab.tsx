'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Plus, Calendar, User as UserIcon, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Video, Link as LinkIcon, MapPin, Clock, Trash2, CheckCircle } from 'lucide-react'
import { BookingWithRelations } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateBookingDrawer from '../modals/CreateBookingDrawer'
import { BookingSkeleton } from '../shared/ListItemSkeleton'
import { useWhopUser } from '@/lib/context/WhopUserContext'
import { useToast } from '@/lib/context/ToastContext'
import { useConfirm } from '@/lib/context/ConfirmDialogContext'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'
import { fetcher } from '@/lib/utils/fetcher'

interface UpcomingTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
}

export default function UpcomingTab({ roleOverride, companyId }: UpcomingTabProps) {
  const { user } = useWhopUser()
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)

  // Use SWR to fetch bookings
  const { data, error, isLoading, mutate } = useSWR<{ bookings: BookingWithRelations[] }>(
    `/api/bookings?companyId=${companyId}&status=upcoming`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  // Filter out bookings where end time has already passed (client-side safety check)
  const now = new Date()
  const bookings = (data?.bookings || []).filter((booking: BookingWithRelations) => {
    const endTime = booking.slot?.end_time || booking.booking_end_time
    if (!endTime) return true // Keep bookings without end time
    return new Date(endTime) >= now
  })

  const loading = isLoading

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
      console.error('Error deleting booking:', error)
      showError('Failed to delete booking', 'Please try again.')
    }
  }

  async function copyMeetingLink(bookingId: string, meetingUrl: string) {
    try {
      await navigator.clipboard.writeText(meetingUrl)
      setCopiedId(bookingId)
      showSuccess('Link copied', 'Meeting link copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  async function finishMeeting(bookingId: string) {
    const confirmed = await confirm.confirm({
      title: 'Finish Meeting?',
      message: 'Mark this meeting as completed? It will be moved to past bookings.',
      confirmText: 'Finish',
      cancelText: 'Cancel',
      variant: 'info',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}?companyId=${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          companyId,
        }),
      })

      if (response.ok) {
        showSuccess('Meeting Finished', 'The meeting has been marked as completed.')
        // Reload bookings using SWR mutate
        mutate()
      } else {
        const error = await response.json()
        showError('Failed to finish meeting', error.error || 'An error occurred while updating the booking.')
      }
    } catch (error) {
      console.error('Error finishing meeting:', error)
      showError('Failed to finish meeting', 'Please try again.')
    }
  }

  function toggleExpanded(bookingId: string) {
    setExpandedBookings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

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

  // Show error if fetch failed (only once)
  useEffect(() => {
    if (error) {
      console.error('Error loading bookings:', error)
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Upcoming Bookings</h2>
          <p className="text-zinc-400 mt-1">
            {isAdmin
              ? 'View and manage all upcoming bookings'
              : 'Your scheduled bookings'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Booking
          </button>
        )}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No upcoming bookings</p>
          <p className="text-zinc-500 text-sm mt-2">
            {isAdmin
              ? 'Create a new booking to get started'
              : 'Book an available time slot to see it here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => {
            const isExpanded = expandedBookings.has(booking.id)

            // Get start and end times from either slot or booking times
            const startTime = booking.slot?.start_time || booking.booking_start_time
            const endTime = booking.slot?.end_time || booking.booking_end_time

            // Get meeting type from slot or pattern
            const meetingType = booking.slot?.meeting_type || booking.pattern?.meeting_type
            const meetingDisplay = getMeetingTypeDisplay(meetingType)
            const MeetingIcon = meetingDisplay.icon

            return (
              <div 
                key={booking.id} 
                className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className="flex-shrink-0 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {booking.title || booking.pattern?.title || booking.slot?.title || 'Booking'}
                        </h3>

                        {/* Date, Time, Duration */}
                        {startTime && (
                          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                            <span className="font-medium text-white">
                              {format(new Date(startTime), 'EEEE, MMMM d, yyyy')}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(startTime), 'h:mm a')}
                            </span>
                            {endTime && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span>
                                  {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))} min
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Meeting Type & Person */}
                        <div className="flex items-center gap-3 text-sm mb-3">
                          <span className={`flex items-center gap-1.5 ${meetingDisplay.color}`}>
                            <MeetingIcon className="w-4 h-4" />
                            {meetingDisplay.label}
                          </span>
                          {isAdmin && (booking.member || booking.guest_name) && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-1.5 text-zinc-300">
                                <UserIcon className="w-4 h-4 text-zinc-400" />
                                {booking.member ? booking.member.name : booking.guest_name}
                                {(booking.member?.email || booking.guest_email) && (
                                  <span className="text-zinc-500">({booking.member?.email || booking.guest_email})</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Description - Expandable */}
                        {booking.description && (
                          <div className="mb-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpanded(booking.id)
                              }}
                              className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Hide details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Show details
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                  {booking.description}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {booking.meeting_url && (
                        <>
                          <a
                            href={booking.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Join
                          </a>
                          {/* <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyMeetingLink(booking.id, booking.meeting_url!)
                            }}
                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/copy"
                            title="Copy meeting link"
                          >
                            {copiedId === booking.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-zinc-400 group-hover/copy:text-zinc-200 transition-colors" />
                            )}
                          </button> */}
                        </>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            finishMeeting(booking.id)
                          }}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                          title="Finish meeting"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Finish
                        </button>
                      )}
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
              </div>
            )
          })}
        </div>
      )}

      {/* Create Booking Drawer */}
      {isAdmin && (
        <CreateBookingDrawer
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => mutate()}
          companyId={companyId}
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
          onFinish={() => mutate()}
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
  onFinish: () => void
}

function BookingDetailsDrawer({ booking, isOpen, onClose, isAdmin, companyId, onFinish }: BookingDetailsDrawerProps) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
      console.error('Error copying link:', error)
    }
  }

  function formatDuration(start: string, end: string) {
    if (!start || !end) return 'N/A'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    return `${minutes} min`
  }

  async function handleFinishMeeting() {
    const confirmed = await confirm.confirm({
      title: 'Finish Meeting?',
      message: 'Mark this meeting as completed? It will be moved to past bookings.',
      confirmText: 'Finish',
      cancelText: 'Cancel',
      variant: 'info',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}?companyId=${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          companyId,
        }),
      })

      if (response.ok) {
        showSuccess('Meeting Finished', 'The meeting has been marked as completed.')
        onFinish()
        onClose()
      } else {
        const error = await response.json()
        showError('Failed to finish meeting', error.error || 'An error occurred while updating the booking.')
      }
    } catch (error) {
      console.error('Error finishing meeting:', error)
      showError('Failed to finish meeting', 'Please try again.')
    }
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
        </div>
      </DrawerContent>

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
              Join Meeting
            </a>
          )}
          {isAdmin && booking.status === 'upcoming' && (
            <button
              onClick={handleFinishMeeting}
              className="btn-primary flex items-center justify-center gap-2 flex-1 bg-blue-500 hover:bg-blue-600"
            >
              <CheckCircle className="w-4 h-4" />
              Finish Meeting
            </button>
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
