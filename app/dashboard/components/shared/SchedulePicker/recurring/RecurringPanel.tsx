'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

const DAYS = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
]

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
]

interface RecurringPanelProps {
  selectedDays: string[]
  selectedTimes: string[]
  onDaysChange: (days: string[]) => void
  onTimesChange: (times: string[]) => void
}

export default function RecurringPanel({
  selectedDays,
  selectedTimes,
  onDaysChange,
  onTimesChange,
}: RecurringPanelProps) {
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day))
    } else {
      onDaysChange([...selectedDays, day])
    }
  }

  const toggleTime = (time: string) => {
    if (selectedTimes.includes(time)) {
      onTimesChange(selectedTimes.filter(t => t !== time))
    } else {
      onTimesChange([...selectedTimes, time])
    }
  }

  const selectWeekdays = () => {
    onDaysChange(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  }

  const selectWeekends = () => {
    onDaysChange(['Sat', 'Sun'])
  }

  const selectAllDays = () => {
    onDaysChange(DAYS.map(d => d.key))
  }

  const selectBusinessHours = () => {
    onTimesChange(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'])
  }

  const selectMornings = () => {
    onTimesChange(['09:00', '10:00', '11:00'])
  }

  const selectAfternoons = () => {
    onTimesChange(['13:00', '14:00', '15:00', '16:00', '17:00'])
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel: Days */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Select Days</h3>

        <div className="space-y-2 mb-4">
          {DAYS.map((day) => {
            const isSelected = selectedDays.includes(day.key)

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all text-left
                  ${isSelected
                    ? 'bg-emerald-500/10 border-2 border-emerald-500'
                    : 'bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-600'
                  }
                `}
              >
                <div
                  className={`
                    w-5 h-5 rounded flex items-center justify-center
                    transition-all
                    ${isSelected
                      ? 'bg-emerald-500'
                      : 'bg-zinc-700 border-2 border-zinc-600'
                    }
                  `}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isSelected ? 'text-emerald-400' : 'text-zinc-300'
                  }`}
                >
                  {day.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t border-zinc-700 space-y-2">
          <p className="text-xs text-zinc-500 mb-2">Quick Select:</p>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </div>

      {/* Right Panel: Times */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Select Times</h3>

        <div className="grid grid-cols-2 gap-2 mb-4 max-h-[320px] overflow-y-auto">
          {TIME_SLOTS.map((time) => {
            const isSelected = selectedTimes.includes(time)
            const hour = parseInt(time.split(':')[0])
            const label = hour >= 12
              ? `${hour === 12 ? 12 : hour - 12}:00 PM`
              : `${hour}:00 AM`

            return (
              <button
                key={time}
                type="button"
                onClick={() => toggleTime(time)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium
                  transition-all
                  ${isSelected
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-900 border-2 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }
                `}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="pt-4 border-t border-zinc-700 space-y-2">
          <p className="text-xs text-zinc-500 mb-2">Quick Select:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectBusinessHours}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Business Hours
            </button>
            <button
              type="button"
              onClick={selectMornings}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Mornings
            </button>
            <button
              type="button"
              onClick={selectAfternoons}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Afternoons
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
