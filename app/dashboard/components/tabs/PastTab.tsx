'use client'

import { useEffect, useState } from 'react'
import { Calendar, User as UserIcon, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookingWithRelations, User } from '@/lib/types/database'
import { format } from 'date-fns'
import { BookingSkeleton } from '../shared/ListItemSkeleton'

interface PastTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function PastTab({ roleOverride }: PastTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadUserAndBookings()
  }, [roleOverride]) // Refetch when role changes

  async function loadUserAndBookings() {
    try {
      setLoading(true)

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()

      let userId = authUser?.id
      let userData = null

      // Handle dev mode - use dev admin ID if no auth
      if (!authUser) {
        userId = '00000000-0000-0000-0000-000000000001'
        // Try to get dev user profile
        const { data: devUserData } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        userData = devUserData
      } else {
        // Get user profile for authenticated user
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        userData = profileData
      }

      setUser(userData)

      // Load past bookings (completed or cancelled)
      const effectiveRole = roleOverride || userData?.role || 'admin'

      let query = supabase
        .from('bookings')
        .select(`
          *,
          member:member_id(id, name, email),
          admin:admin_id(id, name, email),
          slot:slot_id(start_time, end_time)
        `)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })

      if (effectiveRole === 'member') {
        // Members only see their own bookings
        query = query.eq('member_id', userId)
      }
      // Admins see all bookings (no filter needed)

      const { data: bookingsData } = await query

      setBookings(bookingsData || [])
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
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

  const isAdmin = roleOverride ? roleOverride === 'admin' : user?.role === 'admin'

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
            <div key={booking.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/30 transition-colors p-4 opacity-90">
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
                    </div>

                    {/* Row 2: Date, Time, and Person */}
                    {booking.slot && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>
                          {format(new Date(booking.slot.start_time), 'MMM d, yyyy')}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span>
                          {format(new Date(booking.slot.start_time), 'h:mm a')}
                        </span>
                        {isAdmin && booking.member && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="truncate">{booking.member.name}</span>
                          </>
                        )}
                        {!isAdmin && booking.admin && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="truncate">with {booking.admin.name}</span>
                          </>
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
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/link"
                        title="View meeting link"
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-400 group-hover/link:text-zinc-200 transition-colors" />
                      </a>
                      <button
                        onClick={() => copyMeetingLink(booking.id, booking.meeting_url!)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/copy"
                        title="Copy meeting link"
                      >
                        {copiedId === booking.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-zinc-400 group-hover/copy:text-zinc-200 transition-colors" />
                        )}
                      </button>
                    </>
                  )}
                  {booking.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
