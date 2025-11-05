'use client'

import { useState } from 'react'
import ModeTabs, { ScheduleMode } from './ModeTabs'
import DateRangeSelector from './DateRangeSelector'
import RecurringPanel from './recurring/RecurringPanel'
import SpecificPanel from './specific/SpecificPanel'
import SlotsPreview from './SlotsPreview'

interface DateRange {
  start: Date | null
  end: Date | null
  indefinite: boolean
}

interface SpecificDate {
  date: string
  times: string[]
}

export interface ScheduleData {
  mode: ScheduleMode
  dateRange: DateRange
  // Recurring mode data
  recurringDays: string[]
  recurringTimes: string[]
  // Specific mode data
  specificDates: SpecificDate[]
}

interface SchedulePickerProps {
  value: ScheduleData
  onChange: (data: ScheduleData) => void
  error?: string | null
}

export default function SchedulePicker({
  value,
  onChange,
  error,
}: SchedulePickerProps) {
  const updateMode = (mode: ScheduleMode) => {
    onChange({ ...value, mode })
  }

  const updateDateRange = (dateRange: DateRange) => {
    onChange({ ...value, dateRange })
  }

  const updateRecurringDays = (days: string[]) => {
    onChange({ ...value, recurringDays: days })
  }

  const updateRecurringTimes = (times: string[]) => {
    onChange({ ...value, recurringTimes: times })
  }

  const updateSpecificDates = (dates: SpecificDate[]) => {
    onChange({ ...value, specificDates: dates })
  }

  const handleRemoveRecurringSlot = (day: string, time: string) => {
    // Remove this specific day-time combination
    const updatedDays = value.recurringDays.filter(d => d !== day)
    const updatedTimes = value.recurringTimes.filter(t => t !== time)

    // If removing would leave us with no slots, remove just the time or day
    if (updatedDays.length === 0 && updatedTimes.length === 0) {
      // Remove the day
      onChange({
        ...value,
        recurringDays: value.recurringDays.filter(d => d !== day)
      })
    } else if (value.recurringDays.length === 1) {
      // Only one day, remove the time
      onChange({
        ...value,
        recurringTimes: value.recurringTimes.filter(t => t !== time)
      })
    } else if (value.recurringTimes.length === 1) {
      // Only one time, remove the day
      onChange({
        ...value,
        recurringDays: value.recurringDays.filter(d => d !== day)
      })
    }
  }

  const handleRemoveSpecificSlot = (date: string, time: string) => {
    const updatedDates = value.specificDates.map(d => {
      if (d.date === date) {
        return {
          ...d,
          times: d.times.filter(t => t !== time)
        }
      }
      return d
    }).filter(d => d.times.length > 0) // Remove dates with no times

    onChange({ ...value, specificDates: updatedDates })
  }

  // Calculate if we have valid selections
  const hasValidSelection = value.mode === 'recurring'
    ? value.recurringDays.length > 0 && value.recurringTimes.length > 0
    : value.specificDates.length > 0 && value.specificDates.some(d => d.times.length > 0)

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <ModeTabs mode={value.mode} onChange={updateMode} />

      {/* Date Range Selector */}
      <DateRangeSelector
        dateRange={value.dateRange}
        onChange={updateDateRange}
        error={error}
      />

      {/* Schedule Panel based on mode */}
      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
        {value.mode === 'recurring' ? (
          <RecurringPanel
            selectedDays={value.recurringDays}
            selectedTimes={value.recurringTimes}
            onDaysChange={updateRecurringDays}
            onTimesChange={updateRecurringTimes}
          />
        ) : (
          <SpecificPanel
            selectedDates={value.specificDates}
            onDatesChange={updateSpecificDates}
          />
        )}
      </div>

      {/* Slots Preview */}
      {hasValidSelection && (
        <SlotsPreview
          mode={value.mode}
          selectedDays={value.recurringDays}
          selectedTimes={value.recurringTimes}
          onRemoveRecurringSlot={handleRemoveRecurringSlot}
          selectedDates={value.specificDates}
          onRemoveSpecificSlot={handleRemoveSpecificSlot}
        />
      )}

      {/* Validation Message */}
      {!hasValidSelection && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-sm text-amber-400">
            {value.mode === 'recurring'
              ? 'Please select at least one day and one time slot'
              : 'Please add at least one date with time slots'
            }
          </p>
        </div>
      )}
    </div>
  )
}
