interface DrawerContentProps {
  children: React.ReactNode
}

export default function DrawerContent({ children }: DrawerContentProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {children}
    </div>
  )
}
