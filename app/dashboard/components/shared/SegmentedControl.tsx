'use client'

import { useState } from 'react'

export interface SegmentOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  allowCustom?: boolean
  customValue?: string
  onCustomChange?: (value: string) => void
  customPlaceholder?: string
  customUnit?: string
  name?: string
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  allowCustom = false,
  customValue = '',
  onCustomChange,
  customPlaceholder = 'Enter value',
  customUnit = '',
  name,
}: SegmentedControlProps) {
  const isCustomSelected = value === 'custom'

  return (
    <div className="space-y-3">
      {/* Segmented Control */}
      <div className="inline-flex items-center gap-0.5 p-1 bg-zinc-900 rounded-lg">
        {options.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                px-4 py-2 rounded-md font-medium text-sm transition-all duration-150
                ${isSelected
                  ? 'bg-ruby-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }
              `}
            >
              {option.label}
            </button>
          )
        })}

        {allowCustom && (
          <button
            type="button"
            onClick={() => onChange('custom')}
            className={`
              px-4 py-2 rounded-md font-medium text-sm transition-all duration-150
              ${isCustomSelected
                ? 'bg-ruby-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }
            `}
          >
            Custom
          </button>
        )}
      </div>

      {/* Custom Input */}
      {allowCustom && isCustomSelected && (
        <div className="flex items-center gap-2 animate-fade-in">
          <input
            type="number"
            name={name ? `${name}_custom` : undefined}
            value={customValue}
            onChange={(e) => onCustomChange?.(e.target.value)}
            className="input w-32"
            placeholder={customPlaceholder}
            min="0"
          />
          {customUnit && (
            <span className="text-sm text-zinc-400">{customUnit}</span>
          )}
        </div>
      )}
    </div>
  )
}
