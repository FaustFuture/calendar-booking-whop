'use client'

import { useEffect, useState } from 'react'
import { Plus, Clock, Trash2, Edit2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilitySlot, User } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateSlotDrawer from '../modals/CreateSlotDrawer'

interface AvailabilityTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function AvailabilityTab({ roleOverride }: AvailabilityTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadUserAndSlots()
  }, [roleOverride]) // Refetch when role changes

  async function loadUserAndSlots() {
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

      // Load availability slots based on role
      const effectiveRole = roleOverride || userData?.role || 'admin'

      if (effectiveRole === 'admin') {
        // Admins see their own slots
        const { data: slotsData } = await supabase
          .from('availability_slots')
          .select('*')
          .eq('admin_id', userId)
          .order('start_time', { ascending: true })

        setSlots(slotsData || [])
      } else {
        // Members see all available slots
        const { data: slotsData } = await supabase
          .from('availability_slots')
          .select('*')
          .eq('is_available', true)
          .order('start_time', { ascending: true })

        setSlots(slotsData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteSlot(slotId: string) {
    if (!confirm('Are you sure you want to delete this time slot?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId)

      if (!error) {
        loadUserAndSlots()
      }
    } catch (error) {
      console.error('Error deleting slot:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm">Loading availability...</p>
        </div>
      </div>
    )
  }

  const isAdmin = roleOverride ? roleOverride === 'admin' : user?.role === 'admin'

  return (
    <div className="space-y-8">
      {/* Header with gradient */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Availability</h2>
            </div>
            <p className="text-zinc-300 text-lg">
              {isAdmin
                ? 'Manage your available time slots for bookings'
                : 'Browse and book available time slots'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Time Slot
            </button>
          )}
        </div>
      </div>

      {/* Slots List */}
      {slots.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50"></div>
          <div className="relative text-center py-20 px-6">
            <div className="inline-flex p-4 bg-zinc-800 rounded-2xl mb-6 border border-zinc-700/50">
              <Clock className="w-16 h-16 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {isAdmin ? 'No availability slots yet' : 'No slots available'}
            </h3>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              {isAdmin
                ? 'Create your first time slot to start accepting bookings'
                : 'Check back later for available time slots'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-8 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Slot
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 transition-colors"
            >

              <div className="relative p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Title and Icon */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <Clock className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {slot.title || 'Available Time Slot'}
                        </h3>
                        {slot.description && (
                          <p className="text-zinc-400 text-sm line-clamp-2">{slot.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Time Details */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-200 font-medium">
                          {format(new Date(slot.start_time), 'EEE, MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-200 font-medium">
                          {format(new Date(slot.start_time), 'h:mm a')} - {format(new Date(slot.end_time), 'h:mm a')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border ${
                      slot.is_available
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${slot.is_available ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                      {slot.is_available ? 'Available' : 'Booked'}
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin ? (
                    <div className="flex flex-col gap-2">
                      <button className="p-3 hover:bg-zinc-700 rounded-lg transition-colors group/btn border border-transparent hover:border-zinc-600">
                        <Edit2 className="w-5 h-5 text-zinc-400 group-hover/btn:text-white transition-colors" />
                      </button>
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        className="p-3 hover:bg-red-500/10 rounded-lg transition-colors group/btn border border-transparent hover:border-red-500/30"
                      >
                        <Trash2 className="w-5 h-5 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    slot.is_available && (
                      <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors">
                        Book Now
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Slot Drawer */}
      <CreateSlotDrawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUserAndSlots}
        adminId={user?.id || '00000000-0000-0000-0000-000000000001'}
      />
    </div>
  )
}
