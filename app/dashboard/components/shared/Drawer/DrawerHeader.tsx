'use client'

import { X } from 'lucide-react'

interface DrawerHeaderProps {
  title: string
  onClose: () => void
  children?: React.ReactNode
}

export default function DrawerHeader({ title, onClose, children }: DrawerHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Additional header content (e.g., stepper) */}
      {children && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}
