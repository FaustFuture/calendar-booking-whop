'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TimeSlot {
  day: string
  hour: number
  selected: boolean
}

interface WeeklyScheduleGridProps {
  selectedSlots: string[]
  onSlotsChange: (slots: string[]) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = [
  { hour: 9, label: '9 AM' },
  { hour: 10, label: '10 AM' },
  { hour: 11, label: '11 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 13, label: '1 PM' },
  { hour: 14, label: '2 PM' },
  { hour: 15, label: '3 PM' },
  { hour: 16, label: '4 PM' },
  { hour: 17, label: '5 PM' },
]

export default function WeeklyScheduleGrid({
  selectedSlots,
  onSlotsChange,
}: WeeklyScheduleGridProps) {
  const [scheduleType, setScheduleType] = useState<'recurring' | 'specific'>('recurring')

  const toggleSlot = (day: string, hour: number) => {
    const slotKey = `${day}-${hour}`
    const isSelected = selectedSlots.includes(slotKey)

    if (isSelected) {
      onSlotsChange(selectedSlots.filter((s) => s !== slotKey))
    } else {
      onSlotsChange([...selectedSlots, slotKey])
    }
  }

  const clearAll = () => {
    onSlotsChange([])
  }

  const selectBusinessHours = () => {
    const businessSlots: string[] = []
    DAYS.slice(0, 5).forEach((day) => {
      // Mon-Fri
      ;[9, 10, 11, 13, 14, 15, 16, 17].forEach((hour) => {
        // 9-5 except lunch
        businessSlots.push(`${day}-${hour}`)
      })
    })
    onSlotsChange(businessSlots)
  }

  const selectMornings = () => {
    const morningSlots: string[] = []
    DAYS.forEach((day) => {
      ;[9, 10, 11].forEach((hour) => {
        morningSlots.push(`${day}-${hour}`)
      })
    })
    onSlotsChange(morningSlots)
  }

  return (
    <div className="space-y-6">
      {/* Schedule Type Toggle */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400">Schedule Type:</span>
        <div className="inline-flex gap-2 p-1 bg-zinc-900 rounded-lg">
          <button
            type="button"
            onClick={() => setScheduleType('specific')}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all
              ${scheduleType === 'specific'
                ? 'bg-ruby-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            Specific Dates
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('recurring')}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all
              ${scheduleType === 'recurring'
                ? 'bg-ruby-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            Recurring Weekly
          </button>
        </div>
      </div>

      {scheduleType === 'recurring' ? (
        <>
          {/* Weekly Grid */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-zinc-500 w-20">
                      Time
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="p-2 text-center text-xs font-medium text-zinc-300"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(({ hour, label }) => (
                    <tr key={hour}>
                      <td className="p-2 text-xs text-zinc-500">{label}</td>
                      {DAYS.map((day) => {
                        const slotKey = `${day}-${hour}`
                        const isSelected = selectedSlots.includes(slotKey)

                        return (
                          <td key={`${day}-${hour}`} className="p-0.5">
                            <button
                              type="button"
                              onClick={() => toggleSlot(day, hour)}
                              className={`
                                w-full h-8 rounded transition-all duration-150 text-xs
                                ${isSelected
                                  ? 'bg-ruby-500/20 border border-ruby-500 hover:bg-ruby-500/30'
                                  : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                                }
                              `}
                            >
                              {isSelected && (
                                <span className="text-ruby-400 text-xs font-bold">
                                  ✓
                                </span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Quick Select:</span>
            <button
              type="button"
              onClick={selectBusinessHours}
              className="btn-secondary text-sm"
            >
              Business Hours
            </button>
            <button
              type="button"
              onClick={selectMornings}
              className="btn-secondary text-sm"
            >
              Mornings
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="btn-ghost text-sm text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>

          {/* Selected Slots Summary */}
          {selectedSlots.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-zinc-300">
                  Selected Time Slots ({selectedSlots.length})
                </h4>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.slice(0, 10).map((slot) => {
                  const [day, hour] = slot.split('-')
                  const hourLabel = HOURS.find((h) => h.hour === parseInt(hour))
                    ?.label

                  return (
                    <div
                      key={slot}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-ruby-500/10 border border-ruby-500/30 rounded-md text-sm text-ruby-400"
                    >
                      <span>
                        {day} {hourLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const [d, h] = slot.split('-')
                          toggleSlot(d, parseInt(h))
                        }}
                        className="hover:text-ruby-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
                {selectedSlots.length > 10 && (
                  <span className="text-xs text-zinc-500 py-1">
                    +{selectedSlots.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Specific Dates View - Placeholder for now */
        <div className="card text-center py-12">
          <p className="text-zinc-400 mb-4">
            Specific date selection coming soon
          </p>
          <p className="text-sm text-zinc-500">
            For now, use Recurring Weekly to set your availability
          </p>
        </div>
      )}
    </div>
  )
}
