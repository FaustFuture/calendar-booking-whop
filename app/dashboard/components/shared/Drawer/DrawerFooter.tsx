interface DrawerFooterProps {
  children: React.ReactNode
}

export default function DrawerFooter({ children }: DrawerFooterProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4">
      {/* Gradient shadow for scroll indication */}
      <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />

      {children}
    </div>
  )
}
