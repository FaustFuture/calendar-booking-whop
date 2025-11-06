'use client'

import { Clock, Plus, X } from 'lucide-react'
import styles from './SimplifiedSchedulePicker.module.css'

const DAYS = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
]

interface TimeRange {
  id: string
  startTime: string
  endTime: string
}

interface DaySchedule {
  enabled: boolean
  timeRanges: TimeRange[]
}

export interface SimplifiedScheduleData {
  days: Record<string, DaySchedule>
  dateRange: {
    start: Date | null
    end: Date | null
    indefinite: boolean
  }
}

interface SimplifiedSchedulePickerProps {
  value: SimplifiedScheduleData
  onChange: (data: SimplifiedScheduleData) => void
  error?: string | null
}

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function SimplifiedSchedulePicker({
  value,
  onChange,
  error,
}: SimplifiedSchedulePickerProps) {
  const toggleDay = (dayKey: string) => {
    const newDays = { ...value.days }
    const currentDay = newDays[dayKey]

    if (currentDay?.enabled) {
      // Disable the day
      newDays[dayKey] = {
        ...currentDay,
        enabled: false,
      }
    } else {
      // Enable the day with a default time range
      newDays[dayKey] = {
        enabled: true,
        timeRanges: [
          {
            id: generateId(),
            startTime: '09:00',
            endTime: '17:00',
          }
        ],
      }
    }
    onChange({ ...value, days: newDays })
  }

  const addTimeRange = (dayKey: string) => {
    const newDays = { ...value.days }
    const currentDay = newDays[dayKey]

    if (currentDay) {
      newDays[dayKey] = {
        ...currentDay,
        timeRanges: [
          ...currentDay.timeRanges,
          {
            id: generateId(),
            startTime: '09:00',
            endTime: '17:00',
          }
        ],
      }
      onChange({ ...value, days: newDays })
    }
  }

  const removeTimeRange = (dayKey: string, rangeId: string) => {
    const newDays = { ...value.days }
    const currentDay = newDays[dayKey]

    if (currentDay) {
      const updatedRanges = currentDay.timeRanges.filter(r => r.id !== rangeId)

      // If no ranges left, disable the day
      if (updatedRanges.length === 0) {
        newDays[dayKey] = {
          ...currentDay,
          enabled: false,
          timeRanges: [],
        }
      } else {
        newDays[dayKey] = {
          ...currentDay,
          timeRanges: updatedRanges,
        }
      }
      onChange({ ...value, days: newDays })
    }
  }

  const updateTimeRange = (
    dayKey: string,
    rangeId: string,
    field: 'startTime' | 'endTime',
    time: string
  ) => {
    const newDays = { ...value.days }
    const currentDay = newDays[dayKey]

    if (currentDay) {
      newDays[dayKey] = {
        ...currentDay,
        timeRanges: currentDay.timeRanges.map(range =>
          range.id === rangeId
            ? { ...range, [field]: time }
            : range
        ),
      }
      onChange({ ...value, days: newDays })
    }
  }

  const selectWeekdays = () => {
    const weekdayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const newDays = { ...value.days }
    weekdayKeys.forEach(key => {
      newDays[key] = {
        enabled: true,
        timeRanges: newDays[key]?.timeRanges.length > 0
          ? newDays[key].timeRanges
          : [{
              id: generateId(),
              startTime: '09:00',
              endTime: '17:00',
            }],
      }
    })
    onChange({ ...value, days: newDays })
  }

  const selectWeekends = () => {
    const weekendKeys = ['Sat', 'Sun']
    const newDays = { ...value.days }
    weekendKeys.forEach(key => {
      newDays[key] = {
        enabled: true,
        timeRanges: newDays[key]?.timeRanges.length > 0
          ? newDays[key].timeRanges
          : [{
              id: generateId(),
              startTime: '09:00',
              endTime: '17:00',
            }],
      }
    })
    onChange({ ...value, days: newDays })
  }

  const selectAllDays = () => {
    const newDays = { ...value.days }
    DAYS.forEach(({ key }) => {
      newDays[key] = {
        enabled: true,
        timeRanges: newDays[key]?.timeRanges.length > 0
          ? newDays[key].timeRanges
          : [{
              id: generateId(),
              startTime: '09:00',
              endTime: '17:00',
            }],
      }
    })
    onChange({ ...value, days: newDays })
  }

  const clearAll = () => {
    const newDays = { ...value.days }
    DAYS.forEach(({ key }) => {
      if (newDays[key]) {
        newDays[key].enabled = false
      }
    })
    onChange({ ...value, days: newDays })
  }

  const hasValidSelection = DAYS.some(
    day => value.days[day.key]?.enabled
  )

  const formatTimeRange = (ranges: TimeRange[]) => {
    if (ranges.length === 0) return ''
    if (ranges.length === 1) {
      return `${ranges[0].startTime} - ${ranges[0].endTime}`
    }
    return `${ranges.length} time slots`
  }

  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const updateDateRange = (field: 'start' | 'end', dateStr: string) => {
    const newDateRange = { ...value.dateRange }
    if (field === 'start') {
      newDateRange.start = dateStr ? new Date(dateStr) : null
    } else {
      newDateRange.end = dateStr ? new Date(dateStr) : null
    }
    onChange({ ...value, dateRange: newDateRange })
  }

  const toggleIndefinite = () => {
    onChange({
      ...value,
      dateRange: {
        ...value.dateRange,
        indefinite: !value.dateRange.indefinite,
        end: !value.dateRange.indefinite ? null : value.dateRange.end,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Availability Period
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formatDateForInput(value.dateRange.start)}
                onChange={(e) => updateDateRange('start', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formatDateForInput(value.dateRange.end)}
                onChange={(e) => updateDateRange('end', e.target.value)}
                disabled={value.dateRange.indefinite}
                min={formatDateForInput(value.dateRange.start)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.dateRange.indefinite}
              onChange={toggleIndefinite}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">
              Ongoing (no end date)
            </span>
          </label>
        </div>
      </div>

      {/* Days and Time Ranges */}
      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Weekly Availability
        </h3>

        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-zinc-700">
          <button
            type="button"
            onClick={selectWeekdays}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={selectWeekends}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Weekends
          </button>
          <button
            type="button"
            onClick={selectAllDays}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Every Day
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="btn-secondary text-xs px-3 py-1.5 text-red-400 hover:text-red-300"
          >
            Clear All
          </button>
        </div>

        {/* Days List */}
        <div className="space-y-3">
          {DAYS.map((day) => {
            const daySchedule = value.days[day.key]
            const isEnabled = daySchedule?.enabled || false

            return (
              <div
                key={day.key}
                className={`
                  border rounded-lg transition-all
                  ${isEnabled
                    ? 'bg-zinc-800 border-zinc-600'
                    : 'bg-zinc-900 border-zinc-700'
                  }
                `}
              >
                {/* Day Header */}
                <label className="flex items-center gap-3 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleDay(day.key)}
                    className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className={`text-sm font-medium flex-1 ${
                    isEnabled ? 'text-white' : 'text-zinc-400'
                  }`}>
                    {day.label}
                  </span>

                  {isEnabled && daySchedule.timeRanges.length > 0 && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatTimeRange(daySchedule.timeRanges)}
                    </span>
                  )}
                </label>

                {/* Time Ranges */}
                {isEnabled && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="h-px bg-zinc-700 mb-3" />

                    {daySchedule.timeRanges.map((range, index) => (
                      <div
                        key={range.id}
                        className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/50"
                      >
                        <div className="flex items-start gap-3">
                          {/* Time Inputs */}
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div className="relative">
                              <label className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>Start</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="time"
                                  value={range.startTime}
                                  onChange={(e) =>
                                    updateTimeRange(day.key, range.id, 'startTime', e.target.value)
                                  }
                                  className={`${styles.timeInput} w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-zinc-600 transition-all`}
                                />
                              </div>
                            </div>

                            <div className="relative">
                              <label className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>End</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="time"
                                  value={range.endTime}
                                  onChange={(e) =>
                                    updateTimeRange(day.key, range.id, 'endTime', e.target.value)
                                  }
                                  className={`${styles.timeInput} w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-zinc-600 transition-all`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          {daySchedule.timeRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTimeRange(day.key, range.id)}
                              className="mt-6 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Remove time range"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Time Range Button */}
                    <button
                      type="button"
                      onClick={() => addTimeRange(day.key)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-emerald-400 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add another time slot
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Validation Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!hasValidSelection && !error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-sm text-amber-400">
            Please select at least one day with time range
          </p>
        </div>
      )}
    </div>
  )
}
