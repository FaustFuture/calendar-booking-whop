import { headers } from 'next/headers'
import { whopsdk } from '@/lib/whop-sdk'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/types/database'

export interface WhopAuthUser {
  userId: string
  companyId: string
  role: UserRole
  email?: string
  name?: string
  hasAccess: boolean
}

export interface WhopAuthResult {
  success: boolean
  user?: WhopAuthUser
  error?: string
}

/**
 * Verifies the Whop user token from request headers and checks access to a company
 * @param companyId - The company ID to check access for
 * @returns WhopAuthResult with user info and role
 */
export async function verifyWhopUser(companyId: string): Promise<WhopAuthResult> {
  try {
    // Get and verify user token from headers
    const headersList = await headers()
    let userId: string | undefined

    try {
      const result = await whopsdk.verifyUserToken(headersList)
      userId = result.userId
    } catch (error) {
      // In dev mode, allow fallback to environment variable for easier testing
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID) {
        console.warn('⚠️ Using dev mode fallback user ID from environment variable')
        userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
      }
    }

    if (!userId) {
      return {
        success: false,
        error: 'Whop user token not found. If you are the app developer, ensure you are developing in the whop.com iframe and have the dev proxy enabled.'
      }
    }

    // Use dev company ID if in dev mode and not provided
    const effectiveCompanyId = companyId ||
      (process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID : null)

    if (!effectiveCompanyId) {
      return {
        success: false,
        error: 'Company ID is required'
      }
    }

    // Fetch user data and check access in parallel
    const [company, user, access] = await Promise.all([
      whopsdk.companies.retrieve(effectiveCompanyId).catch(() => null),
      whopsdk.users.retrieve(userId).catch(() => null),
      whopsdk.users.checkAccess(effectiveCompanyId, { id: userId }).catch(() => null)
    ])

    if (!company) {
      return {
        success: false,
        error: 'Company not found'
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    if (!access || !access.has_access) {
      return {
        success: false,
        error: 'User does not have access to this company'
      }
    }

    // Determine role based on access level
    const role = await determineUserRole(userId, effectiveCompanyId, access)

    return {
      success: true,
      user: {
        userId,
        companyId: effectiveCompanyId,
        role,
        email: (user as any).email || undefined,
        name: (user as any).username || (user as any).email || 'User',
        hasAccess: true
      }
    }
  } catch (error) {
    console.error('Error verifying Whop user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown authentication error'
    }
  }
}

/**
 * Determines user role (admin or member) based on Whop access data
 * Company owners and users with admin-level access get 'admin' role
 */
async function determineUserRole(
  userId: string,
  companyId: string,
  access: any
): Promise<UserRole> {
  try {
    // Check if user is company owner
    const company = await whopsdk.companies.retrieve(companyId)

    // If user owns the company, they're an admin
    if ((company as any).owner_id === userId) {
      return 'admin'
    }

    // Check for admin-level permissions in access object
    // This depends on your Whop app configuration
    // You may need to adjust this based on your specific access structure
    if ((access as any).role === 'admin' || (access as any).isOwner || (access as any).permissions?.includes('admin')) {
      return 'admin'
    }

    // Default to member role
    return 'member'
  } catch (error) {
    console.error('Error determining user role:', error)
    return 'member' // Default to more restrictive role on error
  }
}

/**
 * Wrapper function that verifies Whop authentication and throws if unauthorized
 * Use this in API routes that require authentication
 */
export async function requireWhopAuth(companyId: string): Promise<WhopAuthUser> {
  const result = await verifyWhopUser(companyId)

  if (!result.success || !result.user) {
    throw new Error(result.error || 'Authentication required')
  }

  return result.user
}

/**
 * Syncs a Whop user to the local Supabase database
 * Creates or updates the user record to maintain relationships with bookings, etc.
 */
export async function syncWhopUserToSupabase(whopUser: WhopAuthUser): Promise<void> {
  try {
    const supabase = await createClient()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', whopUser.userId)
      .single()

    const userData = {
      id: whopUser.userId,
      email: whopUser.email || '',
      name: whopUser.name || '',
      role: whopUser.role,
      updated_at: new Date().toISOString()
    }

    if (existingUser) {
      // Update existing user
      await supabase
        .from('users')
        .update(userData)
        .eq('id', whopUser.userId)
    } else {
      // Insert new user
      await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error syncing Whop user to Supabase:', error)
    // Don't throw - syncing is not critical for auth
  }
}

/**
 * Extracts company ID from request URL
 * Useful for API routes
 */
export function extractCompanyId(url: string): string | null {
  // Pattern: /dashboard/[companyId]/...
  const match = url.match(/\/dashboard\/([^\/]+)/)
  return match ? match[1] : null
}

/**
 * Gets Whop user from request headers without requiring company context
 * Useful for routes that don't have companyId in URL
 */
export async function getWhopUserFromHeaders(): Promise<{ userId: string } | null> {
  try {
    const headersList = await headers()
    const { userId } = await whopsdk.verifyUserToken(headersList)
    return userId ? { userId } : null
  } catch (error) {
    console.error('Error getting Whop user from headers:', error)
    return null
  }
}
