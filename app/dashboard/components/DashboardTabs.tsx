'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, History, Video, Plus } from 'lucide-react'
import AvailabilityTab from './tabs/AvailabilityTab'
import UpcomingTab from './tabs/UpcomingTab'
import PastTab from './tabs/PastTab'
import RecordingsTab from './tabs/RecordingsTab'
import CreateSlotDrawer from './modals/CreateSlotDrawer'
import { AvailabilityPattern } from '@/lib/types/database'
import { updatePastBookingsStatus } from '@/lib/utils/bookings'
import { useWhopUser } from '@/lib/context/WhopUserContext'

export type TabType = 'availability' | 'upcoming' | 'past' | 'recordings'
export type UserRole = 'admin' | 'member'

interface Tab {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'availability', label: 'Availability', icon: Calendar },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
  { id: 'past', label: 'Past', icon: History },
  { id: 'recordings', label: 'Recordings', icon: Video },
]

interface DashboardTabsProps {
  companyId: string
}

export default function DashboardTabs({ companyId }: DashboardTabsProps) {
  const { user, isAdmin } = useWhopUser()
  const [activeTab, setActiveTab] = useState<TabType>('availability')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingPattern, setEditingPattern] = useState<AvailabilityPattern | null>(null)

  // Handle tab change and update past bookings when viewing booking-related tabs
  function handleTabChange(tab: TabType) {
    setActiveTab(tab)
    if (tab === 'upcoming' || tab === 'past') {
      updatePastBookingsStatus()
    }
  }

  useEffect(() => {
    // Update past bookings status on dashboard load
    updatePastBookingsStatus()
  }, [])

  function handleSlotCreated() {
    setRefreshKey(prev => prev + 1)
    setEditingPattern(null)
  }

  function handleEditPattern(pattern: AvailabilityPattern) {
    setEditingPattern(pattern)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingPattern(null)
  }

  function handleBookingSuccess() {
    // Switch to upcoming tab after successful booking
    setActiveTab('upcoming')
  }

  // Early return if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Availability Header - Only show on availability tab */}
      {activeTab === 'availability' && (
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Availability</h2>
              </div>
              <p className="text-zinc-300 text-sm">
                {isAdmin
                  ? 'Manage your available time slots for bookings'
                  : 'Browse and book available time slots'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Time Slot
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="relative">
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm p-1.5">
          <div className="grid grid-cols-4 gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-colors rounded-lg text-sm
                    ${
                      isActive
                        ? 'bg-emerald-500 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'availability' && (
          <AvailabilityTab
            key={`availability-${refreshKey}`}
            roleOverride={user.role}
            companyId={companyId}
            hideHeader
            onEditPattern={handleEditPattern}
            onBookingSuccess={handleBookingSuccess}
            onCreateAvailability={() => setIsModalOpen(true)}
          />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingTab
            key="upcoming"
            roleOverride={user.role}
            companyId={companyId}
          />
        )}
        {activeTab === 'past' && (
          <PastTab
            key="past"
            roleOverride={user.role}
            companyId={companyId}
          />
        )}
        {activeTab === 'recordings' && (
          <RecordingsTab
            key="recordings"
            roleOverride={user.role}
            companyId={companyId}
          />
        )}
      </div>

      {/* Create Slot Modal */}
      <CreateSlotDrawer
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSlotCreated}
        companyId={companyId}
        patternId={editingPattern?.id}
        editData={editingPattern ? {
          title: editingPattern.title,
          description: editingPattern.description || undefined,
          duration_minutes: editingPattern.duration_minutes,
          meeting_type: editingPattern.meeting_type || undefined,
          meeting_config: editingPattern.meeting_config || undefined,
          start_date: editingPattern.start_date,
          end_date: editingPattern.end_date || undefined,
          weekly_schedule: editingPattern.weekly_schedule,
        } : undefined}
      />
    </div>
  )
}
