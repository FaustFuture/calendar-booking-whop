'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { UserRole } from '@/lib/types/database'

export interface WhopUser {
  userId: string
  companyId: string
  role: UserRole
  email?: string
  name?: string
}

interface WhopUserContextType {
  user: WhopUser | null
  isAdmin: boolean
  isMember: boolean
  isLoading: boolean
}

const WhopUserContext = createContext<WhopUserContextType | undefined>(undefined)

interface WhopUserProviderProps {
  children: ReactNode
  user: WhopUser | null
  isLoading?: boolean
}

/**
 * Provider component that wraps the app and provides Whop user context
 * Should be used in layout or page components with user data from server
 */
export function WhopUserProvider({ children, user, isLoading = false }: WhopUserProviderProps) {
  const value: WhopUserContextType = {
    user,
    isAdmin: user?.role === 'admin',
    isMember: user?.role === 'member',
    isLoading
  }

  return (
    <WhopUserContext.Provider value={value}>
      {children}
    </WhopUserContext.Provider>
  )
}

/**
 * Hook to access Whop user context in client components
 * @throws Error if used outside WhopUserProvider
 */
export function useWhopUser(): WhopUserContextType {
  const context = useContext(WhopUserContext)

  if (context === undefined) {
    throw new Error('useWhopUser must be used within a WhopUserProvider')
  }

  return context
}

/**
 * Hook that returns only the user object (convenience wrapper)
 */
export function useWhopUserData(): WhopUser | null {
  const { user } = useWhopUser()
  return user
}

/**
 * Hook that returns only the role check helpers
 */
export function useWhopRole(): { isAdmin: boolean; isMember: boolean; role: UserRole | null } {
  const { isAdmin, isMember, user } = useWhopUser()
  return { isAdmin, isMember, role: user?.role || null }
}
