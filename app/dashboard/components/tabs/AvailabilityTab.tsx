'use client'

import { useEffect, useState } from 'react'
import { Plus, Clock, Trash2, Edit2, Calendar, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityPattern, User } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateSlotDrawer from '../modals/CreateSlotDrawer'

interface AvailabilityTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function AvailabilityTab({ roleOverride }: AvailabilityTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([])
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

      // Load availability patterns based on role
      const effectiveRole = roleOverride || userData?.role || 'admin'

      if (effectiveRole === 'admin') {
        // Admins see their own patterns
        const { data: patternsData } = await supabase
          .from('availability_patterns')
          .select('*')
          .eq('admin_id', userId)
          .order('created_at', { ascending: false })

        setPatterns(patternsData || [])
      } else {
        // Members see all active patterns
        const { data: patternsData } = await supabase
          .from('availability_patterns')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        setPatterns(patternsData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deletePattern(patternId: string) {
    if (!confirm('Are you sure you want to delete this availability pattern?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('availability_patterns')
        .delete()
        .eq('id', patternId)

      if (!error) {
        loadUserAndSlots()
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  function formatDaySchedule(weeklySchedule: Record<string, Array<{ start: string; end: string }>>) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const enabledDays = dayOrder.filter(day => weeklySchedule[day] && weeklySchedule[day].length > 0)

    if (enabledDays.length === 0) return 'No schedule set'

    return enabledDays.map(day => {
      const ranges = weeklySchedule[day]
      const timeRanges = ranges.map(r => `${r.start}-${r.end}`).join(', ')
      return `${day}: ${timeRanges}`
    }).join(' • ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-ruby-500/30 border-t-ruby-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm">Loading availability...</p>
        </div>
      </div>
    )
  }

  const isAdmin = roleOverride ? roleOverride === 'admin' : user?.role === 'admin'

  return (
    <div className="space-y-8">
      {/* Header with gradient */}
      <div className="rounded-2xl bg-gradient-to-br from-ruby-500/10 via-ruby-500/5 to-transparent border border-ruby-500/20 p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-ruby-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-ruby-400" />
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
              className="px-6 py-3 bg-ruby-500 hover:bg-ruby-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Time Slot
            </button>
          )}
        </div>
      </div>

      {/* Patterns List */}
      {patterns.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50"></div>
          <div className="relative text-center py-20 px-6">
            <div className="inline-flex p-4 bg-zinc-800 rounded-2xl mb-6 border border-zinc-700/50">
              <Clock className="w-16 h-16 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {isAdmin ? 'No availability patterns yet' : 'No availability patterns'}
            </h3>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              {isAdmin
                ? 'Create your first availability pattern to start accepting bookings'
                : 'Check back later for available booking slots'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-8 px-6 py-3 bg-ruby-500 hover:bg-ruby-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Availability
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-ruby-500/50 transition-colors"
            >
              <div className="relative p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Title and Icon */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 p-3 bg-ruby-500/10 border border-ruby-500/20 rounded-xl">
                        <Clock className="w-6 h-6 text-ruby-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {pattern.title}
                        </h3>
                        {pattern.description && (
                          <p className="text-zinc-400 text-sm line-clamp-2">{pattern.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Pattern Details */}
                    <div className="space-y-3 mb-4">
                      {/* Duration and Price */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                          <Clock className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-200 text-sm font-medium">
                            {pattern.duration_minutes} min
                          </span>
                        </div>
                        {pattern.price !== undefined && pattern.price > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                            <DollarSign className="w-4 h-4 text-zinc-400" />
                            <span className="text-zinc-200 text-sm font-medium">
                              ${pattern.price}
                            </span>
                          </div>
                        )}
                        {pattern.meeting_type && (
                          <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <span className="text-blue-300 text-sm font-medium capitalize">
                              {pattern.meeting_type.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-200 text-sm">
                          {format(new Date(pattern.start_date), 'MMM d, yyyy')}
                          {pattern.end_date ? ` - ${format(new Date(pattern.end_date), 'MMM d, yyyy')}` : ' - Indefinite'}
                        </span>
                      </div>

                      {/* Weekly Schedule */}
                      <div className="px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                        <p className="text-zinc-200 text-sm">
                          {formatDaySchedule(pattern.weekly_schedule)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border ${
                      pattern.is_active
                        ? 'bg-ruby-500/10 border-ruby-500/30 text-ruby-400'
                        : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${pattern.is_active ? 'bg-ruby-400' : 'bg-zinc-500'}`}></span>
                      {pattern.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin ? (
                    <div className="flex flex-col gap-2">
                      <button className="p-3 hover:bg-zinc-700 rounded-lg transition-colors group/btn border border-transparent hover:border-zinc-600">
                        <Edit2 className="w-5 h-5 text-zinc-400 group-hover/btn:text-white transition-colors" />
                      </button>
                      <button
                        onClick={() => deletePattern(pattern.id)}
                        className="p-3 hover:bg-red-500/10 rounded-lg transition-colors group/btn border border-transparent hover:border-red-500/30"
                      >
                        <Trash2 className="w-5 h-5 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    pattern.is_active && (
                      <button className="px-6 py-3 bg-ruby-500 hover:bg-ruby-600 text-white rounded-xl font-semibold transition-colors">
                        View Slots
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
