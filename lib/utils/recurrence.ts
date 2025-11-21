/**
 * Recurrence Utility
 * Generates recurring dates based on recurrence configuration
 */

import { addDays, addWeeks, addMonths, format, parse, isBefore, isAfter } from 'date-fns'
import { RecurrenceType, RecurrenceEndType } from '@/lib/types/database'

export interface RecurrenceConfig {
  type: RecurrenceType
  interval: number // e.g., every 2 weeks
  daysOfWeek?: string[] // ['Mon', 'Wed', 'Fri'] for weekly
  dayOfMonth?: number // 1-31 for monthly
  endType: RecurrenceEndType
  count?: number // Number of occurrences
  endDate?: string // ISO date string
}

/**
 * Generate all recurring dates based on configuration
 * @param startDate - Starting date (ISO string or Date)
 * @param config - Recurrence configuration
 * @returns Array of Date objects for each occurrence
 */
export function generateRecurringDates(
  startDate: string | Date,
  config: RecurrenceConfig
): Date[] {
  const dates: Date[] = []
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate

  // Add the first occurrence
  dates.push(new Date(start))

  // Calculate end date based on config
  let shouldContinue = true
  let currentDate = new Date(start)
  let occurrenceCount = 1

  while (shouldContinue) {
    let nextDate: Date

    switch (config.type) {
      case 'daily':
        nextDate = addDays(currentDate, config.interval)
        break

      case 'weekly':
        nextDate = addWeeks(currentDate, config.interval)
        break

      case 'monthly':
        nextDate = addMonths(currentDate, config.interval)
        // If dayOfMonth is specified, use it
        if (config.dayOfMonth) {
          nextDate.setDate(Math.min(config.dayOfMonth, getDaysInMonth(nextDate)))
        }
        break

      case 'custom':
        // For custom, use interval as days
        nextDate = addDays(currentDate, config.interval)
        break

      default:
        throw new Error(`Unsupported recurrence type: ${config.type}`)
    }

    // Check if we should continue
    if (config.endType === 'count') {
      if (occurrenceCount >= (config.count || 1)) {
        shouldContinue = false
        break
      }
    } else if (config.endType === 'date') {
      if (config.endDate && isAfter(nextDate, new Date(config.endDate))) {
        shouldContinue = false
        break
      }
    }

    // Add the date
    dates.push(new Date(nextDate))
    currentDate = nextDate
    occurrenceCount++

    // Safety check to prevent infinite loops
    if (occurrenceCount > 365) {
      console.warn('Recurrence generation exceeded 365 occurrences, stopping')
      break
    }
  }

  return dates
}

/**
 * Generate recurring booking times based on pattern configuration
 * @param firstBookingStart - Start time of the first booking
 * @param firstBookingEnd - End time of the first booking
 * @param config - Recurrence configuration
 * @returns Array of {start, end} time pairs
 */
export function generateRecurringBookingTimes(
  firstBookingStart: string,
  firstBookingEnd: string,
  config: RecurrenceConfig
): Array<{ start: Date; end: Date }> {
  const startDate = new Date(firstBookingStart)
  const endDate = new Date(firstBookingEnd)
  const duration = endDate.getTime() - startDate.getTime()

  const recurringDates = generateRecurringDates(startDate, config)

  return recurringDates.map((date) => ({
    start: new Date(date),
    end: new Date(date.getTime() + duration),
  }))
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Format recurrence description for display
 */
export function getRecurrenceDescription(config: RecurrenceConfig): string {
  let description = ''

  switch (config.type) {
    case 'daily':
      description = config.interval === 1
        ? 'Every day'
        : `Every ${config.interval} days`
      break

    case 'weekly':
      description = config.interval === 1
        ? 'Every week'
        : `Every ${config.interval} weeks`
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        description += ` on ${config.daysOfWeek.join(', ')}`
      }
      break

    case 'monthly':
      description = config.interval === 1
        ? 'Every month'
        : `Every ${config.interval} months`
      if (config.dayOfMonth) {
        description += ` on day ${config.dayOfMonth}`
      }
      break

    case 'custom':
      description = `Every ${config.interval} days`
      break
  }

  // Add end condition
  if (config.endType === 'count' && config.count) {
    description += `, ${config.count} times`
  } else if (config.endType === 'date' && config.endDate) {
    description += `, until ${format(new Date(config.endDate), 'MMM d, yyyy')}`
  }

  return description
}

/**
 * Validate recurrence configuration
 */
export function validateRecurrenceConfig(config: Partial<RecurrenceConfig>): string | null {
  if (!config.type) return 'Recurrence type is required'
  if (!config.interval || config.interval < 1) return 'Interval must be at least 1'
  if (!config.endType) return 'End type is required'

  if (config.endType === 'count') {
    if (!config.count || config.count < 1) return 'Count must be at least 1'
    if (config.count > 365) return 'Count cannot exceed 365 occurrences'
  }

  if (config.endType === 'date') {
    if (!config.endDate) return 'End date is required'
    if (isBefore(new Date(config.endDate), new Date())) {
      return 'End date must be in the future'
    }
  }

  if (config.type === 'weekly' && (!config.daysOfWeek || config.daysOfWeek.length === 0)) {
    return 'At least one day of the week is required for weekly recurrence'
  }

  if (config.type === 'monthly') {
    if (config.dayOfMonth && (config.dayOfMonth < 1 || config.dayOfMonth > 31)) {
      return 'Day of month must be between 1 and 31'
    }
  }

  return null
}
