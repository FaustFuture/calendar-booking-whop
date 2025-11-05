'use client'

import { useEffect, useState } from 'react'
import { Plus, Calendar, User as UserIcon, ExternalLink, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookingWithRelations, User } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateBookingModal from '../modals/CreateBookingModal'

interface UpcomingTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function UpcomingTab({ roleOverride }: UpcomingTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

      // Load bookings based on role
      const effectiveRole = roleOverride || userData?.role || 'admin'

      let query = supabase
        .from('bookings')
        .select(`
          *,
          member:member_id(id, name, email),
          admin:admin_id(id, name, email),
          slot:slot_id(start_time, end_time)
        `)
        .eq('status', 'upcoming')
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

  async function cancelBooking(bookingId: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (!error) {
        // Reload bookings
        loadUserAndBookings()
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const isAdmin = roleOverride ? roleOverride === 'admin' : user?.role === 'admin'

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
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
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
          {bookings.map((booking) => (
            <div key={booking.id} className="card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-ruby-400" />
                    <h3 className="text-lg font-semibold text-white">
                      {booking.title}
                    </h3>
                  </div>

                  {booking.slot && (
                    <div className="space-y-1 text-sm mb-3">
                      <p className="text-zinc-300">
                        {format(new Date(booking.slot.start_time), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-zinc-400">
                        {format(new Date(booking.slot.start_time), 'h:mm a')} -{' '}
                        {format(new Date(booking.slot.end_time), 'h:mm a')}
                      </p>
                    </div>
                  )}

                  {isAdmin && booking.member && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                      <UserIcon className="w-4 h-4" />
                      <span>{booking.member.name}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{booking.member.email}</span>
                    </div>
                  )}

                  {!isAdmin && booking.admin && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                      <UserIcon className="w-4 h-4" />
                      <span>with {booking.admin.name}</span>
                    </div>
                  )}

                  {booking.description && (
                    <p className="text-zinc-500 text-sm mb-3">{booking.description}</p>
                  )}

                  {booking.meeting_url && (
                    <a
                      href={booking.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-ruby-400 hover:text-ruby-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Join Meeting
                    </a>
                  )}

                  {booking.notes && (
                    <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">Notes:</p>
                      <p className="text-sm text-zinc-400">{booking.notes}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => cancelBooking(booking.id)}
                  className="btn-ghost p-2 text-red-400 hover:text-red-300"
                  title="Cancel booking"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Booking Modal */}
      {user && user.role === 'admin' && (
        <CreateBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadUserAndBookings}
          adminId={user.id}
        />
      )}
    </div>
  )
}
