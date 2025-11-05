'use client'

import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import { SimplifiedScheduleData } from './SimplifiedSchedulePicker'

interface SlotsPreviewCountProps {
  scheduleData: SimplifiedScheduleData
  duration: number // in minutes
}

export default function SlotsPreviewCount({ scheduleData, duration }: SlotsPreviewCountProps) {
  const calculateSlotCount = (): number => {
    const { days, dateRange } = scheduleData

    // Get enabled days
    const enabledDays = Object.entries(days).filter(([_, day]) => day.enabled)
    if (enabledDays.length === 0) return 0

    // Calculate date range
    const startDate = dateRange.start || new Date()
    const endDate = dateRange.indefinite
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days default
      : dateRange.end

    if (!endDate) return 0

    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    }

    let totalSlots = 0
    const currentDate = new Date(startDate)

    // Count days and slots
    while (currentDate <= endDate) {
      const dayName = Object.keys(dayMap).find(
        key => dayMap[key] === currentDate.getDay()
      )

      if (dayName && days[dayName]?.enabled) {
        const daySchedule = days[dayName]

        // Count slots for each time range
        daySchedule.timeRanges.forEach(range => {
          const [startHour, startMinute] = range.startTime.split(':').map(Number)
          const [endHour, endMinute] = range.endTime.split(':').map(Number)

          const rangeMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
          const slotsInRange = Math.floor(rangeMinutes / duration)
          totalSlots += slotsInRange
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return totalSlots
  }

  const calculateWeeks = (): number => {
    const { dateRange } = scheduleData
    const startDate = dateRange.start || new Date()
    const endDate = dateRange.indefinite
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : dateRange.end

    if (!endDate) return 0

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.ceil(diffDays / 7)
  }

  const slotCount = calculateSlotCount()
  const weeks = calculateWeeks()

  if (slotCount === 0) return null

  const isHighCount = slotCount > 200

  return (
    <div className={`rounded-lg p-4 border ${
      isHighCount
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-blue-500/10 border-blue-500/30'
    }`}>
      <div className="flex items-start gap-3">
        {isHighCount ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1">
          <h4 className={`text-sm font-semibold mb-2 ${
            isHighCount ? 'text-amber-300' : 'text-blue-300'
          }`}>
            {isHighCount ? 'Large Number of Slots' : 'Slots Preview'}
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className={isHighCount ? 'text-amber-200' : 'text-blue-200'}>
                Total slots to create:
              </span>
              <span className={`font-bold ${isHighCount ? 'text-amber-100' : 'text-blue-100'}`}>
                {slotCount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className={isHighCount ? 'text-amber-300' : 'text-blue-300'}>
                Duration:
              </span>
              <span className={isHighCount ? 'text-amber-200' : 'text-blue-200'}>
                {weeks} {weeks === 1 ? 'week' : 'weeks'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs pt-2 border-t ${
              isHighCount ? 'border-amber-500/20 text-amber-400' : 'border-blue-500/20 text-blue-400'
            }">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {duration} min slots × {Object.values(scheduleData.days).filter(d => d.enabled).length} days/week
              </span>
            </div>
          </div>

          {isHighCount && (
            <p className="text-xs text-amber-400 mt-3 pt-3 border-t border-amber-500/20">
              ⚠️ Consider using a shorter date range to reduce the number of slots
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
