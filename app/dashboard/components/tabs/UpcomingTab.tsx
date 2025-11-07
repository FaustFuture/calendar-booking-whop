'use client'

import { useEffect, useState } from 'react'
import { Plus, Calendar, User as UserIcon, ExternalLink, X, Copy, Check, ChevronDown, ChevronUp, Video, Link as LinkIcon, MapPin, Clock } from 'lucide-react'
import { BookingWithRelations } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateBookingDrawer from '../modals/CreateBookingDrawer'
import { BookingSkeleton } from '../shared/ListItemSkeleton'

interface UpcomingTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
}

export default function UpcomingTab({ roleOverride, companyId }: UpcomingTabProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadBookings()
  }, [roleOverride, companyId]) // Refetch when role or companyId changes

  async function loadBookings() {
    try {
      setLoading(true)

      const response = await fetch(`/api/bookings?companyId=${companyId}&status=upcoming`)
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()

      console.log('📊 [UpcomingTab] Received bookings data:', {
        hasBookings: !!data.bookings,
        count: data.bookings?.length || 0,
        firstBooking: data.bookings?.[0] ? {
          id: data.bookings[0].id,
          title: data.bookings[0].title,
          booking_start_time: data.bookings[0].booking_start_time,
          pattern_title: data.bookings[0].pattern?.title,
          hasPattern: !!data.bookings[0].pattern
        } : null
      })

      // Filter out bookings where end time has already passed (client-side safety check)
      const now = new Date()
      const upcomingBookings = (data.bookings || []).filter((booking: BookingWithRelations) => {
        const endTime = booking.slot?.end_time || booking.booking_end_time
        if (!endTime) return true // Keep bookings without end time
        return new Date(endTime) >= now
      })

      console.log('📊 [UpcomingTab] After filtering:', {
        count: upcomingBookings.length
      })

      setBookings(upcomingBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking(bookingId: string) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          status: 'cancelled'
        }),
      })

      if (response.ok) {
        // Reload bookings
        loadBookings()
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
    }
  }

  async function copyMeetingLink(bookingId: string, meetingUrl: string) {
    try {
      await navigator.clipboard.writeText(meetingUrl)
      setCopiedId(bookingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
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
      case 'google_meet':
        return { icon: Video, label: 'Google Meet', color: 'text-blue-400' }
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
              <div key={booking.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 transition-colors">
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
                          {!isAdmin && booking.admin && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-1.5 text-zinc-300">
                                <UserIcon className="w-4 h-4 text-zinc-400" />
                                Host: {booking.admin.name}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Description - Expandable */}
                        {booking.description && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleExpanded(booking.id)}
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
                          >
                            <ExternalLink className="w-4 h-4" />
                            Join
                          </a>
                          <button
                            onClick={() => copyMeetingLink(booking.id, booking.meeting_url!)}
                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/copy"
                            title="Copy meeting link"
                          >
                            {copiedId === booking.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-zinc-400 group-hover/copy:text-zinc-200 transition-colors" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                        title="Cancel booking"
                      >
                        <X className="w-4 h-4 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                      </button>
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
          onSuccess={loadBookings}
          companyId={companyId}
        />
      )}
    </div>
  )
}
