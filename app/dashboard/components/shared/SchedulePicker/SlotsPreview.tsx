'use client'

import { X, Calendar, Repeat } from 'lucide-react'
import { ScheduleMode } from './ModeTabs'

interface SpecificDate {
  date: string
  times: string[]
}

interface SlotsPreviewProps {
  mode: ScheduleMode
  // Recurring mode
  selectedDays?: string[]
  selectedTimes?: string[]
  onRemoveRecurringSlot?: (day: string, time: string) => void
  // Specific mode
  selectedDates?: SpecificDate[]
  onRemoveSpecificSlot?: (date: string, time: string) => void
}

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

export default function SlotsPreview({
  mode,
  selectedDays = [],
  selectedTimes = [],
  onRemoveRecurringSlot,
  selectedDates = [],
  onRemoveSpecificSlot,
}: SlotsPreviewProps) {
  const formatTime = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    return hour >= 12
      ? `${hour === 12 ? 12 : hour - 12}:00 PM`
      : `${hour}:00 AM`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate total slots
  const totalSlots = mode === 'recurring'
    ? selectedDays.length * selectedTimes.length
    : selectedDates.reduce((sum, d) => sum + d.times.length, 0)

  if (totalSlots === 0) {
    return null
  }

  // Generate slot list for recurring mode
  const recurringSlots = mode === 'recurring'
    ? selectedDays.flatMap(day =>
        selectedTimes.map(time => ({ day, time }))
      )
    : []

  // Generate slot list for specific mode
  const specificSlots = mode === 'specific'
    ? selectedDates.flatMap(d =>
        d.times.map(time => ({ date: d.date, time }))
      )
    : []

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {mode === 'recurring' ? (
            <Repeat className="w-5 h-5 text-emerald-400" />
          ) : (
            <Calendar className="w-5 h-5 text-emerald-400" />
          )}
          <h3 className="text-sm font-semibold text-white">
            Selected Slots ({totalSlots})
          </h3>
        </div>
        <p className="text-xs text-zinc-500">
          {mode === 'recurring'
            ? `${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''} × ${selectedTimes.length} time${selectedTimes.length !== 1 ? 's' : ''}`
            : `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      <div className="max-h-[200px] overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {mode === 'recurring' && recurringSlots.map((slot, index) => (
            <div
              key={`${slot.day}-${slot.time}-${index}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-sm"
            >
              <span className="text-emerald-400 font-medium">
                {DAY_LABELS[slot.day]?.slice(0, 3)} {formatTime(slot.time)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveRecurringSlot?.(slot.day, slot.time)}
                className="hover:text-emerald-300 text-emerald-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {mode === 'specific' && specificSlots.map((slot, index) => (
            <div
              key={`${slot.date}-${slot.time}-${index}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm"
            >
              <span className="text-blue-400 font-medium">
                {formatDate(slot.date)} {formatTime(slot.time)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveSpecificSlot?.(slot.date, slot.time)}
                className="hover:text-blue-300 text-blue-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {totalSlots > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <p className="text-xs text-zinc-500">
            {mode === 'recurring' && (
              <>
                These time slots will repeat weekly on the selected days
                {selectedDays.length > 0 && ` (${selectedDays.join(', ')})`}
              </>
            )}
            {mode === 'specific' && (
              <>
                These are one-time slots for specific dates
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
