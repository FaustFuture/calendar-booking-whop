"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayButton } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date | null
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10 px-3 py-2 text-sm bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white",
            !date && "text-zinc-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-auto p-0 bg-zinc-800 border-zinc-700 z-[1050] shadow-xl",
          className
        )}
        align="start"
        sideOffset={5}
      >
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate)
            setOpen(false)
          }}
          disabled={disabled}
          initialFocus
          fromDate={minDate}
          className="bg-zinc-800 text-white p-3 rounded-lg"
          classNames={{
            root: "text-white",
            months: "text-white",
            month: "text-white",
            caption: "flex items-center justify-center relative mb-4 px-4 h-9 pb-2",
            caption_label: "text-white font-semibold text-sm leading-none pb-2",
            nav: "flex items-center gap-3 absolute top-0 left-0 right-0 justify-between h-9 px-2 pb-0",
            button_previous: "h-7 w-7 bg-zinc-700 hover:bg-zinc-600 text-white border-0 rounded-md p-0 flex items-center justify-center shrink-0 ml-1",
            button_next: "h-7 w-7 bg-zinc-700 hover:bg-zinc-600 text-white border-0 rounded-md p-0 flex items-center justify-center shrink-0 mr-1",
            month_caption: "flex items-center justify-center h-full flex-1 pb-2",
            dropdowns: "text-white",
            dropdown_root: "bg-zinc-700 border-zinc-600 text-white",
            dropdown: "text-white",
            table: "w-full border-collapse",
            weekdays: "flex mb-2",
            weekday: "text-zinc-400 font-medium text-xs w-9 flex items-center justify-center",
            week: "flex w-full mt-1",
            day: "text-white",
            day_selected: "bg-emerald-500 text-white hover:bg-emerald-500/90 hover:text-white focus:bg-emerald-500 focus:text-white rounded-md",
            day_today: "bg-zinc-700 text-black font-semibold rounded-md",
            day_outside: "text-zinc-600 opacity-50",
            day_disabled: "text-zinc-600 opacity-30 cursor-not-allowed",
            day_hidden: "invisible",
          }}
          components={{
            DayButton: ({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
              const isSelected = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
              const isToday = modifiers.today
              return (
                <button
                  data-selected-single={isSelected}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm font-normal text-white transition-colors",
                    isSelected 
                      ? "!bg-emerald-500 !text-white hover:!bg-emerald-500/90" 
                      : isToday
                      ? "!text-black"
                      : "hover:bg-emerald-500/70 hover:text-white focus:bg-emerald-500/70 focus:text-white",
                    className
                  )}
                  {...props}
                />
              )
            },
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

