'use client'

import { useState } from 'react'
import { Calendar, Check, X } from 'lucide-react'

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
]

interface SpecificDate {
  date: string // ISO date string (YYYY-MM-DD)
  times: string[] // Selected time slots for this date
}

interface SpecificPanelProps {
  selectedDates: SpecificDate[]
  onDatesChange: (dates: SpecificDate[]) => void
}

export default function SpecificPanel({
  selectedDates,
  onDatesChange,
}: SpecificPanelProps) {
  const [pickerDate, setPickerDate] = useState('')
  const [selectedDateForTimes, setSelectedDateForTimes] = useState<string | null>(null)

  const addDate = (dateStr: string) => {
    if (!dateStr) return

    const exists = selectedDates.find(d => d.date === dateStr)
    if (!exists) {
      onDatesChange([...selectedDates, { date: dateStr, times: [] }])
      setSelectedDateForTimes(dateStr)
    } else {
      setSelectedDateForTimes(dateStr)
    }
  }

  const removeDate = (dateStr: string) => {
    onDatesChange(selectedDates.filter(d => d.date !== dateStr))
    if (selectedDateForTimes === dateStr) {
      setSelectedDateForTimes(null)
    }
  }

  const toggleTime = (dateStr: string, time: string) => {
    const updatedDates = selectedDates.map(d => {
      if (d.date === dateStr) {
        const hasTime = d.times.includes(time)
        return {
          ...d,
          times: hasTime
            ? d.times.filter(t => t !== time)
            : [...d.times, time]
        }
      }
      return d
    })
    onDatesChange(updatedDates)
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    return hour >= 12
      ? `${hour === 12 ? 12 : hour - 12}:00 PM`
      : `${hour}:00 AM`
  }

  const currentDate = selectedDates.find(d => d.date === selectedDateForTimes)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel: Date Picker */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Select Dates</h3>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="date"
              value={pickerDate}
              onChange={(e) => setPickerDate(e.target.value)}
              className="input flex-1"
              min={new Date().toISOString().split('T')[0]}
            />
            <button
              type="button"
              onClick={() => {
                addDate(pickerDate)
                setPickerDate('')
              }}
              disabled={!pickerDate}
              className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 mb-3">Selected Dates ({selectedDates.length})</p>

            {selectedDates.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No dates selected</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {selectedDates.map((item) => {
                  const isActive = selectedDateForTimes === item.date
                  const hasCompleteTimes = item.times.length > 0

                  return (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => setSelectedDateForTimes(item.date)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg
                        transition-all text-left
                        ${isActive
                          ? 'bg-ruby-500/10 border-2 border-ruby-500'
                          : 'bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`
                            w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                            ${hasCompleteTimes
                              ? 'bg-ruby-500'
                              : 'bg-zinc-700 border-2 border-zinc-600'
                            }
                          `}
                        >
                          {hasCompleteTimes && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isActive ? 'text-ruby-400' : 'text-zinc-300'
                          }`}>
                            {formatDateDisplay(item.date)}
                          </p>
                          {item.times.length > 0 && (
                            <p className="text-xs text-zinc-500">
                              {item.times.length} time{item.times.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeDate(item.date)
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Time Slots for Selected Date */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          {selectedDateForTimes ? 'Select Times' : 'Select a Date First'}
        </h3>

        {selectedDateForTimes && currentDate ? (
          <>
            <div className="mb-4 p-3 bg-zinc-900 rounded-lg border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Adding times for:</p>
              <p className="text-sm font-medium text-ruby-400">
                {formatDateDisplay(selectedDateForTimes)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 max-h-[240px] overflow-y-auto">
              {TIME_SLOTS.map((time) => {
                const isSelected = currentDate.times.includes(time)

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(selectedDateForTimes, time)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium
                      transition-all
                      ${isSelected
                        ? 'bg-ruby-500/20 border-2 border-ruby-500 text-ruby-400'
                        : 'bg-zinc-900 border-2 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                      }
                    `}
                  >
                    {formatTime(time)}
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-zinc-700">
              <p className="text-xs text-zinc-500 mb-2">Quick Select:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updatedDates = selectedDates.map(d => {
                      if (d.date === selectedDateForTimes) {
                        return {
                          ...d,
                          times: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']
                        }
                      }
                      return d
                    })
                    onDatesChange(updatedDates)
                  }}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Business Hours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedDates = selectedDates.map(d => {
                      if (d.date === selectedDateForTimes) {
                        return { ...d, times: ['09:00', '10:00', '11:00'] }
                      }
                      return d
                    })
                    onDatesChange(updatedDates)
                  }}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Mornings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedDates = selectedDates.map(d => {
                      if (d.date === selectedDateForTimes) {
                        return { ...d, times: ['13:00', '14:00', '15:00', '16:00', '17:00'] }
                      }
                      return d
                    })
                    onDatesChange(updatedDates)
                  }}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Afternoons
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 mb-2">No date selected</p>
            <p className="text-xs text-zinc-500">
              Select a date from the left to choose time slots
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
