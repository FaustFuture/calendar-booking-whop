'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { getTimezoneOptions, TimezoneOption } from '@/lib/utils/timezones'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimezoneSelectProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function TimezoneSelect({ value, onValueChange, className }: TimezoneSelectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const timezones = useMemo(() => getTimezoneOptions(), [])
  
  const filteredTimezones = useMemo(() => {
    if (!searchQuery) return timezones
    
    const lowerQuery = searchQuery.toLowerCase()
    return timezones.filter(tz => 
      tz.label.toLowerCase().includes(lowerQuery) ||
      tz.value.toLowerCase().includes(lowerQuery) ||
      tz.abbr.toLowerCase().includes(lowerQuery) ||
      tz.offset.includes(lowerQuery)
    )
  }, [timezones, searchQuery])
  
  const selectedTimezone = timezones.find(tz => tz.value === value)
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className || "w-full bg-zinc-800 border-zinc-700 text-white"}>
        <SelectValue placeholder="Select timezone">
          {selectedTimezone && (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedTimezone.abbr}</span>
              <span className="text-zinc-400">({selectedTimezone.offset})</span>
              <span className="text-zinc-500">-</span>
              <span className="text-zinc-300">{selectedTimezone.label.split(' - ')[1] || selectedTimezone.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-[400px] z-[1050]">
        {/* Search Input */}
        <div className="sticky top-0 z-10 bg-zinc-900 p-2 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search timezones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        {/* Timezone Options */}
        <div className="p-1">
          {filteredTimezones.length === 0 ? (
            <div className="px-3 py-6 text-center text-zinc-500 text-sm">
              No timezones found
            </div>
          ) : (
            filteredTimezones.map((tz) => (
              <SelectItem 
                key={tz.value} 
                value={tz.value} 
                className="text-white hover:bg-zinc-800 cursor-pointer"
              >
                <div className="flex items-center gap-2 py-1">
                  <span className="font-semibold text-emerald-400 min-w-[80px]">
                    {tz.abbr}
                  </span>
                  <span className="text-zinc-500 min-w-[70px]">
                    {tz.offset}
                  </span>
                  <span className="text-zinc-300">
                    {tz.label.split(' - ')[1] || tz.label}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  )
}