/**
 * Calendar Events Cache
 * Simple in-memory cache for Google Calendar events to reduce API calls
 * Cache expires after 5 minutes
 */

import { CalendarBusyTime } from '@/lib/types/database'

interface CacheEntry {
  busyTimes: CalendarBusyTime[]
  expiry: number // Timestamp when this entry expires
}

class CalendarCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  /**
   * Generate cache key from user ID and time range
   */
  private generateKey(userId: string, startDate: string, endDate: string): string {
    return `${userId}:${startDate}:${endDate}`
  }

  /**
   * Get cached calendar events if available and not expired
   */
  get(
    userId: string,
    startDate: string,
    endDate: string
  ): { busyTimes: CalendarBusyTime[]; expiry: Date } | null {
    const key = this.generateKey(userId, startDate, endDate)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return {
      busyTimes: entry.busyTimes,
      expiry: new Date(entry.expiry),
    }
  }

  /**
   * Store calendar events in cache
   */
  set(userId: string, startDate: string, endDate: string, busyTimes: CalendarBusyTime[]): void {
    const key = this.generateKey(userId, startDate, endDate)
    const expiry = Date.now() + this.CACHE_DURATION

    this.cache.set(key, {
      busyTimes,
      expiry,
    })

    // Clean up expired entries periodically
    this.cleanExpired()
  }

  /**
   * Clear cache for a specific user or all users
   */
  clear(userId?: string): void {
    if (userId) {
      // Clear all entries for this user
      const keysToDelete: string[] = []
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key))
    } else {
      // Clear entire cache
      this.cache.clear()
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    totalEntries: number
    expiredEntries: number
  } {
    const now = Date.now()
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expiredEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
    }
  }
}

// Export singleton instance
export const calendarCache = new CalendarCache()
