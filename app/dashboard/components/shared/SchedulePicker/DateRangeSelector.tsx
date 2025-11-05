'use client'

import { Calendar } from 'lucide-react'

interface DateRange {
  start: Date | null
  end: Date | null
  indefinite: boolean
}

interface DateRangeSelectorProps {
  dateRange: DateRange
  onChange: (range: DateRange) => void
  error?: string | null
}

export default function DateRangeSelector({ dateRange, onChange, error }: DateRangeSelectorProps) {
  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onChange({ ...dateRange, start: date })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onChange({ ...dateRange, end: date })
  }

  const handleIndefiniteToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...dateRange, indefinite: e.target.checked })
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-ruby-400" />
        <h3 className="text-base font-semibold text-white">Availability Window</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              From
            </label>
            <input
              type="date"
              value={formatDateForInput(dateRange.start)}
              onChange={handleStartChange}
              disabled={dateRange.indefinite}
              className="input w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              To
            </label>
            <input
              type="date"
              value={formatDateForInput(dateRange.end)}
              onChange={handleEndChange}
              disabled={dateRange.indefinite}
              className="input w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dateRange.indefinite}
            onChange={handleIndefiniteToggle}
            className="w-4 h-4 text-ruby-500 bg-zinc-700 border-zinc-600 rounded focus:ring-ruby-500 focus:ring-2"
          />
          <span className="text-sm text-zinc-300">
            No end date (indefinite availability)
          </span>
        </label>

        {error && (
          <p className="text-sm text-amber-400 flex items-start gap-2">
            <span className="text-amber-500">⚠</span>
            {error}
          </p>
        )}

        {!dateRange.indefinite && dateRange.start && dateRange.end && (
          <p className="text-xs text-zinc-500">
            Availability will be created for these dates
          </p>
        )}
      </div>
    </div>
  )
}
