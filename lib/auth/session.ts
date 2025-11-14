import { cache } from 'react'
import { verifyWhopUser, syncWhopUserToSupabase, type WhopAuthUser } from './whop'
import { UserRole } from '@/lib/types/database'

/**
 * Cached function to get Whop user session
 * Uses React cache to avoid redundant API calls during SSR
 */
export const getWhopSession = cache(async (companyId: string) => {
  const result = await verifyWhopUser(companyId)

  if (result.success && result.user) {
    // Sync user to Supabase in background
    syncWhopUserToSupabase(result.user).catch(() => {
      // Failed to sync user
    })

    return {
      user: result.user,
      isAuthenticated: true
    }
  }

  return {
    user: null,
    isAuthenticated: false,
    error: result.error
  }
})

/**
 * Check if user has admin role
 */
export function isAdmin(user: WhopAuthUser | null): boolean {
  return user?.role === 'admin'
}

/**
 * Check if user has member role
 */
export function isMember(user: WhopAuthUser | null): boolean {
  return user?.role === 'member'
}

/**
 * Check if user has specific role
 */
export function hasRole(user: WhopAuthUser | null, role: UserRole): boolean {
  return user?.role === role
}

/**
 * Assert that user has admin role, throw error if not
 */
export function requireAdmin(user: WhopAuthUser | null): asserts user is WhopAuthUser {
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required')
  }
}

/**
 * Assert that user is authenticated, throw error if not
 */
export function requireAuth(user: WhopAuthUser | null): asserts user is WhopAuthUser {
  if (!user) {
    throw new Error('Authentication required')
  }
}

/**
 * Get user ID safely
 */
export function getUserId(user: WhopAuthUser | null): string | null {
  return user?.userId || null
}

/**
 * Get company ID safely
 */
export function getCompanyId(user: WhopAuthUser | null): string | null {
  return user?.companyId || null
}

/**
 * Role-based query filter helper
 * Returns the appropriate filter for database queries based on user role
 */
export function getRoleBasedFilter(user: WhopAuthUser | null) {
  if (!user) {
    return { filterByUser: true, userId: null }
  }

  // Admins can see all data for their company
  if (user.role === 'admin') {
    return { filterByUser: false, userId: user.userId }
  }

  // Members can only see their own data
  return { filterByUser: true, userId: user.userId }
}
