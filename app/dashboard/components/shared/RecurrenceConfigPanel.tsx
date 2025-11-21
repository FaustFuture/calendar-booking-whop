'use client'

import { useState, useEffect } from 'react'
import { RepeatIcon, Calendar } from 'lucide-react'
import { RecurrenceType, RecurrenceEndType } from '@/lib/types/database'
import { getRecurrenceDescription, validateRecurrenceConfig } from '@/lib/utils/recurrence'

interface RecurrenceConfig {
  isRecurring: boolean
  type: RecurrenceType
  interval: number
  daysOfWeek: string[]
  dayOfMonth: number
  endType: RecurrenceEndType
  count: number
  endDate: string
}

interface RecurrenceConfigPanelProps {
  config: RecurrenceConfig
  onChange: (config: RecurrenceConfig) => void
  error?: string
}

const DAYS_OF_WEEK = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
  { value: 'Sun', label: 'Sun' },
]

export default function RecurrenceConfigPanel({ config, onChange, error }: RecurrenceConfigPanelProps) {
  const [description, setDescription] = useState<string>('')

  // Update description when config changes
  useEffect(() => {
    if (config.isRecurring) {
      try {
        const desc = getRecurrenceDescription({
          type: config.type,
          interval: config.interval,
          daysOfWeek: config.daysOfWeek,
          dayOfMonth: config.dayOfMonth,
          endType: config.endType,
          count: config.count,
          endDate: config.endDate,
        })
        setDescription(desc)
      } catch (e) {
        setDescription('')
      }
    }
  }, [config])

  const toggleRecurring = () => {
    onChange({ ...config, isRecurring: !config.isRecurring })
  }

  const updateConfig = (updates: Partial<RecurrenceConfig>) => {
    onChange({ ...config, ...updates })
  }

  const toggleDayOfWeek = (day: string) => {
    const newDays = config.daysOfWeek.includes(day)
      ? config.daysOfWeek.filter(d => d !== day)
      : [...config.daysOfWeek, day]
    updateConfig({ daysOfWeek: newDays })
  }

  return (
    <div className="space-y-4">
      {/* Toggle Recurring */}
      <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
        <div className="flex items-center gap-3">
          <RepeatIcon className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-white font-medium">Make this recurring</p>
            <p className="text-xs text-zinc-400">Create multiple bookings automatically</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleRecurring}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.isRecurring ? 'bg-emerald-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.isRecurring ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {config.isRecurring && (
        <>
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Repeat Pattern
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateConfig({ type: option.value as RecurrenceType })}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    config.type === option.value
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-emerald-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Repeat Every
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={config.interval}
                onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-zinc-400 text-sm">
                {config.type === 'daily' && 'day(s)'}
                {config.type === 'weekly' && 'week(s)'}
                {config.type === 'monthly' && 'month(s)'}
                {config.type === 'custom' && 'day(s)'}
              </span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {config.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Repeat On
              </label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={`flex-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      config.daysOfWeek.includes(day.value)
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-emerald-500'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {config.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={config.dayOfMonth}
                onChange={(e) => updateConfig({ dayOfMonth: parseInt(e.target.value) || 1 })}
                placeholder="Day (1-31)"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                If day doesn't exist in month, last day will be used
              </p>
            </div>
          )}

          {/* End Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              End Repeat
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => updateConfig({ endType: 'count' })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  config.endType === 'count'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-emerald-500'
                }`}
              >
                After # times
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ endType: 'date' })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  config.endType === 'date'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-emerald-500'
                }`}
              >
                On date
              </button>
            </div>

            {config.endType === 'count' && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Number of Occurrences
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.count}
                  onChange={(e) => updateConfig({ count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {config.endType === 'date' && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => updateConfig({ endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Description Preview */}
          {description && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-emerald-400 mb-1">Recurrence Summary</p>
                  <p className="text-sm text-emerald-300">{description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
