'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type DrawerWidth = 'sm' | 'md' | 'lg' | 'xl'

interface DrawerProps {
  open: boolean
  onClose: () => void
  width?: DrawerWidth
  children: React.ReactNode
}

const widthClasses: Record<DrawerWidth, string> = {
  sm: 'w-full sm:w-[480px]',
  md: 'w-full sm:w-[600px]',
  lg: 'w-full sm:w-[600px] lg:w-[720px]',
  xl: 'w-full sm:w-[600px] lg:w-[720px] xl:w-[800px]',
}

export default function Drawer({ open, onClose, width = 'lg', children }: DrawerProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[1030] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              duration: 0.28,
              ease: [0.4, 0, 0.2, 1], // ease-out curve
            }}
            className={`
              fixed inset-y-0 right-0 z-[1040]
              ${widthClasses[width]}
              bg-zinc-900 shadow-2xl
              flex flex-col
              overflow-hidden
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
