'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { getUserTimezone, getTimezoneLabel } from '@/lib/utils/timezone'

/**
 * Simple debugger component that displays the current detected timezone
 * Useful for development and troubleshooting timezone issues
 */
export default function TimezoneDebugger() {
  const [timezone, setTimezone] = useState<string>('')
  const [timezoneLabel, setTimezoneLabel] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    // Get timezone info on mount
    const tz = getUserTimezone()
    const label = getTimezoneLabel(tz)
    setTimezone(tz)
    setTimezoneLabel(label)

    // Update current time every second
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-lg px-4 py-3 min-w-[280px]">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-400 mb-1">
              Detected Timezone
            </div>
            <div className="text-sm font-semibold text-white mb-1">
              {timezoneLabel}
            </div>
            <div className="text-xs text-zinc-500 font-mono mb-2">
              {timezone}
            </div>
            <div className="text-sm text-emerald-400 font-mono">
              {currentTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
