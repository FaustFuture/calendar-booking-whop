'use client'

import { useState } from 'react'
import { Calendar, Clock, History, Video } from 'lucide-react'
import AvailabilityTab from './tabs/AvailabilityTab'
import UpcomingTab from './tabs/UpcomingTab'
import PastTab from './tabs/PastTab'
import RecordingsTab from './tabs/RecordingsTab'
import RoleSwitcher from './RoleSwitcher'

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

export default function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('availability')
  const [roleOverride, setRoleOverride] = useState<UserRole>('admin')

  return (
    <div className="w-full space-y-8">
      {/* Role Switcher (Development Only) */}
      <RoleSwitcher currentRole={roleOverride} onRoleChange={setRoleOverride} />

      {/* Tab Navigation */}
      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm p-2">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center justify-center gap-3 px-6 py-4 font-semibold transition-colors rounded-xl
                    ${
                      isActive
                        ? 'bg-emerald-500 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
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
          <AvailabilityTab key="availability" roleOverride={roleOverride} />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingTab key="upcoming" roleOverride={roleOverride} />
        )}
        {activeTab === 'past' && (
          <PastTab key="past" roleOverride={roleOverride} />
        )}
        {activeTab === 'recordings' && (
          <RecordingsTab key="recordings" roleOverride={roleOverride} />
        )}
      </div>
    </div>
  )
}
