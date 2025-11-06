'use client'

import { Repeat, Calendar } from 'lucide-react'

export type ScheduleMode = 'recurring' | 'specific'

interface ModeTabsProps {
  mode: ScheduleMode
  onChange: (mode: ScheduleMode) => void
}

export default function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-700 rounded-lg">
      <button
        type="button"
        onClick={() => onChange('recurring')}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md
          font-medium text-sm transition-all
          ${mode === 'recurring'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }
        `}
      >
        <Repeat className="w-4 h-4" />
        Recurring
      </button>

      <button
        type="button"
        onClick={() => onChange('specific')}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md
          font-medium text-sm transition-all
          ${mode === 'specific'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }
        `}
      >
        <Calendar className="w-4 h-4" />
        Specific Dates
      </button>
    </div>
  )
}
