'use client'

import { useEffect, useState } from 'react'
import { Calendar, User as UserIcon, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookingWithRelations, User } from '@/lib/types/database'
import { format } from 'date-fns'

interface PastTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function PastTab({ roleOverride }: PastTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
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
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="card opacity-90">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white">
                      {booking.title}
                    </h3>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${booking.status === 'completed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-red-500/20 text-red-400'}
                    `}>
                      {booking.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
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

                  {booking.notes && (
                    <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">Notes:</p>
                      <p className="text-sm text-zinc-400">{booking.notes}</p>
                    </div>
                  )}
                </div>

                {booking.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
