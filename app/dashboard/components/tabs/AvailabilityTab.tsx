'use client'

import { useEffect, useState } from 'react'
import { Plus, Clock, Trash2, Edit2, Calendar, DollarSign, Video, Link as LinkIcon, MapPin } from 'lucide-react'
import { AvailabilityPattern } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateSlotDrawer from '../modals/CreateSlotDrawer'
import ViewSlotsModal from '../modals/ViewSlotsModal'
import { AvailabilityPatternSkeleton } from '../shared/ListItemSkeleton'

interface AvailabilityTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
  hideHeader?: boolean
  onEditPattern?: (pattern: AvailabilityPattern) => void
}

export default function AvailabilityTab({ roleOverride, companyId, hideHeader, onEditPattern }: AvailabilityTabProps) {
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<AvailabilityPattern | null>(null)
  const [isViewSlotsModalOpen, setIsViewSlotsModalOpen] = useState(false)

  useEffect(() => {
    loadPatterns()
  }, [roleOverride, companyId]) // Refetch when role or companyId changes

  async function loadPatterns() {
    try {
      setLoading(true)

      const response = await fetch(`/api/availability/patterns?companyId=${companyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch availability patterns')
      }

      const data = await response.json()
      setPatterns(data.patterns || [])
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
      const response = await fetch(`/api/availability/patterns/${patternId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        loadPatterns()
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  function handleViewSlots(pattern: AvailabilityPattern) {
    setSelectedPattern(pattern)
    setIsViewSlotsModalOpen(true)
  }

  function handleCloseViewSlots() {
    setIsViewSlotsModalOpen(false)
    setSelectedPattern(null)
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

  function getMeetingTypeDisplay(meetingType?: string) {
    switch (meetingType) {
      case 'google_meet':
        return { icon: Video, label: 'Google Meet', color: 'text-blue-400' }
      case 'zoom':
        return { icon: Video, label: 'Zoom', color: 'text-blue-600' }
      case 'manual_link':
        return { icon: LinkIcon, label: 'Manual Link', color: 'text-purple-400' }
      case 'location':
        return { icon: MapPin, label: 'Physical Location', color: 'text-green-400' }
      default:
        return { icon: Video, label: 'Meeting', color: 'text-zinc-400' }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Patterns skeleton */}
        <div className="grid gap-3">
          <AvailabilityPatternSkeleton />
          <AvailabilityPatternSkeleton />
          <AvailabilityPatternSkeleton />
        </div>
      </div>
    )
  }

  const isAdmin = roleOverride === 'admin'

  return (
    <div className={hideHeader ? 'space-y-6' : 'space-y-8'}>
      {/* Header with gradient - only show if not hidden */}
      {!hideHeader && (
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
      )}

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
                className="mt-8 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Availability
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 transition-colors"
            >
              <div className="relative p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div className="flex-shrink-0 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>

                    {/* Content - 2 rows */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Title and Status */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-white truncate">
                          {pattern.title}
                        </h3>
                        <span className={`flex-shrink-0 w-2 h-2 rounded-full ${pattern.is_active ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                      </div>

                      {/* Row 2: Quick Info */}
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {pattern.duration_minutes}min
                        </span>
                        {pattern.price !== undefined && pattern.price > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${pattern.price}
                          </span>
                        )}
                        {(() => {
                          const meetingDisplay = getMeetingTypeDisplay(pattern.meeting_type)
                          const MeetingIcon = meetingDisplay.icon
                          return (
                            <span className={`flex items-center gap-1 ${meetingDisplay.color}`}>
                              <MeetingIcon className="w-3.5 h-3.5" />
                              {meetingDisplay.label}
                            </span>
                          )
                        })()}
                        <span className="truncate">
                          {format(new Date(pattern.start_date), 'MMM d, yyyy')}
                          {pattern.end_date ? ` - ${format(new Date(pattern.end_date), 'MMM d')}` : ' - Ongoing'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onEditPattern?.(pattern)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/btn"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-white transition-colors" />
                      </button>
                      <button
                        onClick={() => deletePattern(pattern.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    pattern.is_active && (
                      <button
                        onClick={() => handleViewSlots(pattern)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                      >
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

      {/* Create Slot Drawer - only show if header is not hidden */}
      {!hideHeader && (
        <CreateSlotDrawer
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadPatterns}
          companyId={companyId}
        />
      )}

      {/* View Slots Modal - for members to browse and book slots */}
      <ViewSlotsModal
        isOpen={isViewSlotsModalOpen}
        onClose={handleCloseViewSlots}
        pattern={selectedPattern}
        companyId={companyId}
        onBookingSuccess={() => {
          loadPatterns()
          handleCloseViewSlots()
        }}
      />
    </div>
  )
}
