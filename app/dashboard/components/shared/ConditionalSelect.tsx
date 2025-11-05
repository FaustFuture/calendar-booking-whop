'use client'

import { Video, Link as LinkIcon, MapPin } from 'lucide-react'

export type MeetingType = 'google_meet' | 'zoom' | 'manual_link' | 'location'

interface ConditionalSelectProps {
  value: MeetingType
  onChange: (value: MeetingType) => void
  conditionalValue: string
  onConditionalChange: (value: string) => void
}

const meetingOptions = [
  { value: 'google_meet' as MeetingType, label: 'Google Meet', icon: Video },
  { value: 'zoom' as MeetingType, label: 'Zoom', icon: Video },
  { value: 'manual_link' as MeetingType, label: 'Manual Link', icon: LinkIcon },
  { value: 'location' as MeetingType, label: 'Physical Location', icon: MapPin },
]

export default function ConditionalSelect({
  value,
  onChange,
  conditionalValue,
  onConditionalChange,
}: ConditionalSelectProps) {
  const showUrlInput = value === 'manual_link'
  const showLocationInput = value === 'location'
  const selectedOption = meetingOptions.find((opt) => opt.value === value)

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as MeetingType)}
          className="input w-full appearance-none pr-10"
        >
          {meetingOptions.map((option) => {
            const Icon = option.icon
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {selectedOption && (
            <selectedOption.icon className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Conditional Input - Manual Link */}
      {showUrlInput && (
        <div className="animate-fade-in space-y-2">
          <input
            type="url"
            value={conditionalValue}
            onChange={(e) => onConditionalChange(e.target.value)}
            className="input w-full"
            placeholder="https://meet.google.com/abc-defg-hij"
          />
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            Enter the full meeting URL
          </p>
        </div>
      )}

      {/* Conditional Input - Location */}
      {showLocationInput && (
        <div className="animate-fade-in space-y-2">
          <textarea
            value={conditionalValue}
            onChange={(e) => onConditionalChange(e.target.value)}
            className="input w-full min-h-[80px]"
            placeholder="123 Main Street, City, State, ZIP"
          />
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Enter the physical address
          </p>
        </div>
      )}

      {/* Info for Google Meet / Zoom */}
      {(value === 'google_meet' || value === 'zoom') && (
        <p className="text-xs text-zinc-500 animate-fade-in">
          Meeting link will be generated automatically for each booking
        </p>
      )}
    </div>
  )
}
