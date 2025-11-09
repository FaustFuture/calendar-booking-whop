'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Plus, Clock, Trash2, Edit2, Calendar, Video, Link as LinkIcon, MapPin } from 'lucide-react'
import { AvailabilityPattern } from '@/lib/types/database'
import { format } from 'date-fns'
import CreateSlotDrawer from '../modals/CreateSlotDrawer'
import ViewSlotsDrawer from '../modals/ViewSlotsDrawer'
import { AvailabilityPatternSkeleton } from '../shared/ListItemSkeleton'
import { useWhopUser } from '@/lib/context/WhopUserContext'
import { useConfirm } from '@/lib/context/ConfirmDialogContext'
import { useToast } from '@/lib/context/ToastContext'
import { fetcher } from '@/lib/utils/fetcher'

interface AvailabilityTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
  hideHeader?: boolean
  onEditPattern?: (pattern: AvailabilityPattern) => void
  onBookingSuccess?: () => void
  onCreateAvailability?: () => void
}

export default function AvailabilityTab({ roleOverride, companyId, hideHeader, onEditPattern, onBookingSuccess, onCreateAvailability }: AvailabilityTabProps) {
  const { user } = useWhopUser() // Get current user from context
  const confirm = useConfirm()
  const { showSuccess, showError } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<AvailabilityPattern | null>(null)
  const [isViewSlotsModalOpen, setIsViewSlotsModalOpen] = useState(false)

  // Use SWR to fetch availability patterns
  const { data, error, isLoading, mutate } = useSWR<{ patterns: AvailabilityPattern[] }>(
    `/api/availability/patterns?companyId=${companyId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  // Filter patterns based on role
  const allPatterns = data?.patterns || []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const patterns = roleOverride === 'member'
    ? allPatterns.filter((pattern: AvailabilityPattern) => {
        // Must be active
        if (!pattern.is_active) return false

        // Check if pattern has ended
        if (pattern.end_date) {
          const endDate = new Date(pattern.end_date)
          if (endDate < today) return false
        }

        // Check if pattern has started
        const startDate = new Date(pattern.start_date)
        if (startDate > today) return false

        return true
      })
    : allPatterns // Admins see all patterns

  const loading = isLoading

  // Show error if fetch failed
  useEffect(() => {
    if (error) {
      console.error('Error loading availability patterns:', error)
      showError('Failed to load availability patterns', error.message || 'Please try again.')
    }
  }, [error, showError])

  async function deletePattern(patternId: string) {
    const confirmed = await confirm.confirm({
      title: 'Delete Availability Pattern?',
      message: 'Are you sure you want to delete this availability pattern? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/availability/patterns/${patternId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        showSuccess('Pattern Deleted', 'The availability pattern has been deleted successfully.')
        mutate() // Refresh patterns using SWR mutate
      } else {
        const errorData = await response.json()
        showError('Delete Failed', errorData.error || 'Failed to delete the pattern.')
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
      showError('Delete Failed', 'An error occurred while deleting the pattern.')
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

  function getPatternStatus(pattern: AvailabilityPattern) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDate = new Date(pattern.start_date)

    if (!pattern.is_active) {
      return { label: 'Inactive', color: 'text-zinc-500', bgColor: 'bg-zinc-500/10' }
    }

    if (startDate > today) {
      return { label: 'Not Started', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' }
    }

    if (pattern.end_date) {
      const endDate = new Date(pattern.end_date)
      if (endDate < today) {
        return { label: 'Expired', color: 'text-red-500', bgColor: 'bg-red-500/10' }
      }
    }

    return { label: 'Active', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
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
              {isAdmin ? 'No availability patterns yet' : 'No available time slots'}
            </h3>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              {isAdmin
                ? 'Create your first availability pattern to start accepting bookings'
                : 'There are currently no active booking slots available. Please check back later.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  if (onCreateAvailability) {
                    onCreateAvailability()
                  } else {
                    setIsModalOpen(true)
                  }
                }}
                className="mt-8 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Availability
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {patterns.map((pattern) => {
            const status = getPatternStatus(pattern)
            const isExpiredOrNotStarted = status.label === 'Expired' || status.label === 'Not Started' || status.label === 'Inactive'
            const meetingDisplay = getMeetingTypeDisplay(pattern.meeting_type)
            const MeetingIcon = meetingDisplay.icon

            return (
              <div
                key={pattern.id}
                className={`group relative overflow-hidden rounded-lg border transition-all duration-200 flex flex-col ${
                  isAdmin && isExpiredOrNotStarted
                    ? 'border-zinc-700/30 bg-zinc-800/30 opacity-60'
                    : 'border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
                }`}
              >
                {/* Card Header */}
                <div className="p-3 pb-2.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Icon */}
                    <div className="flex-shrink-0 p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                      <Clock className="w-4 h-4 text-emerald-400" />
                    </div>
                    
                    {/* Status Badge - Top Right */}
                    {isAdmin && (
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${status.color} ${status.bgColor} border-current/20`}>
                        {status.label}
                      </span>
                    )}
                    {!isAdmin && (
                      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${pattern.is_active ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-white mb-2.5 line-clamp-2">
                    {pattern.title}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="px-3 pb-2.5 flex-1 space-y-2">
                  {/* Duration */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{pattern.duration_minutes}min</span>
                  </div>

                  {/* Meeting Type */}
                  <div className={`flex items-center gap-1.5 text-xs ${meetingDisplay.color}`}>
                    <MeetingIcon className="w-3.5 h-3.5" />
                    <span className="truncate">{meetingDisplay.label}</span>
                  </div>

                  {/* Date Range */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="line-clamp-1">
                      {format(new Date(pattern.start_date), 'MMM d')}
                      {pattern.end_date ? ` - ${format(new Date(pattern.end_date), 'MMM d')}` : ' - Ongoing'}
                    </span>
                  </div>
                </div>

                {/* Card Footer - Actions */}
                <div className="px-3 py-2.5 pt-2 border-t border-zinc-700/50">
                  {isAdmin ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEditPattern?.(pattern)}
                        className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors group/btn"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-white transition-colors" />
                      </button>
                      <button
                        onClick={() => deletePattern(pattern.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    pattern.is_active && (
                      <button
                        onClick={() => handleViewSlots(pattern)}
                        className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        View Slots
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Slot Drawer - only show if header is not hidden */}
      {!hideHeader && (
        <CreateSlotDrawer
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => mutate()}
          companyId={companyId}
        />
      )}

      {/* View Slots Drawer - for members to browse and book slots */}
      <ViewSlotsDrawer
        isOpen={isViewSlotsModalOpen}
        onClose={handleCloseViewSlots}
        pattern={selectedPattern}
        companyId={companyId}
        currentUserId={user?.userId || null}
        currentUserEmail={user?.email || null}
        onBookingSuccess={() => {
          mutate() // Refresh patterns using SWR mutate
          handleCloseViewSlots()
          onBookingSuccess?.()
        }}
      />
    </div>
  )
}
