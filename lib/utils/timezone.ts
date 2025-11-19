/**
 * Timezone utilities for handling user timezones across the application
 */

/**
 * Get the user's current timezone using Intl API
 * Returns IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn('Failed to detect user timezone, falling back to UTC')
    return 'UTC'
  }
}

/**
 * Convert a datetime-local string to ISO string in user's timezone
 * @param localDateTimeString - String from datetime-local input (e.g., '2025-01-19T14:30')
 * @param timezone - Optional timezone (defaults to user's current timezone)
 * @returns ISO 8601 string with timezone information
 */
export function localDateTimeToISO(localDateTimeString: string, timezone?: string): string {
  const tz = timezone || getUserTimezone()

  // datetime-local gives us 'YYYY-MM-DDTHH:mm'
  // We need to interpret this as being in the user's timezone
  const date = new Date(localDateTimeString)

  // Return as ISO string (will be in UTC but we'll pass timezone separately to APIs)
  return date.toISOString()
}

/**
 * Convert ISO string to datetime-local format for input fields
 * @param isoString - ISO 8601 datetime string
 * @returns String in datetime-local format (YYYY-MM-DDTHH:mm)
 */
export function isoToLocalDateTime(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get a human-readable timezone label
 * @param timezone - IANA timezone identifier
 * @returns Formatted timezone string (e.g., 'EST (UTC-5)' or 'PST (UTC-8)')
 */
export function getTimezoneLabel(timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const now = new Date()

  try {
    // Get timezone abbreviation
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })

    const parts = formatter.formatToParts(now)
    const timeZonePart = parts.find(part => part.type === 'timeZoneName')
    const abbreviation = timeZonePart?.value || tz

    // Get UTC offset
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    })

    const offsetParts = offsetFormatter.formatToParts(now)
    const offsetPart = offsetParts.find(part => part.type === 'timeZoneName')
    const offset = offsetPart?.value || ''

    return `${abbreviation} ${offset}`
  } catch (error) {
    return tz
  }
}
