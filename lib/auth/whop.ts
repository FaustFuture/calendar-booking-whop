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
 * @param requireAccess - Whether to require company access check (default: false for basic auth)
 * @returns WhopAuthResult with user info and role
 */
export async function verifyWhopUser(companyId: string, requireAccess = false): Promise<WhopAuthResult> {
  try {
    console.log('[Whop Auth] Starting verification for companyId:', companyId, 'requireAccess:', requireAccess)

    // Get and verify user token from headers
    const headersList = await headers()
    let userId: string | undefined

    try {
      const result = await whopsdk.verifyUserToken(headersList)
      userId = result.userId
      console.log('[Whop Auth] User token verified, userId:', userId)
    } catch (error) {
      console.warn('[Whop Auth] Token verification failed:', error instanceof Error ? error.message : error)

      // In dev mode, allow fallback to environment variable for easier testing
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID) {
        console.warn('[Whop Auth] Using dev mode fallback user ID from environment variable')
        userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
      }
    }

    if (!userId) {
      console.error('[Whop Auth] No user ID found after token verification')
      return {
        success: false,
        error: 'Whop user token not found. If you are the app developer, ensure you are developing in the whop.com iframe and have the dev proxy enabled.'
      }
    }

    // Use dev company ID if in dev mode and not provided
    const effectiveCompanyId = companyId ||
      (process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID : null)

    if (!effectiveCompanyId) {
      console.error('[Whop Auth] No effective company ID available')
      return {
        success: false,
        error: 'Company ID is required'
      }
    }

    console.log('[Whop Auth] Using effective company ID:', effectiveCompanyId)

    // Fetch user data and company info
    console.log('[Whop Auth] Fetching company and user data...')
    const [company, user] = await Promise.all([
      whopsdk.companies.retrieve(effectiveCompanyId).catch((err) => {
        console.error('[Whop Auth] Failed to retrieve company:', err)
        return null
      }),
      whopsdk.users.retrieve(userId).catch((err) => {
        console.error('[Whop Auth] Failed to retrieve user:', err)
        return null
      })
    ])

    if (!company) {
      console.error('[Whop Auth] Company not found:', effectiveCompanyId)
      return {
        success: false,
        error: `Company not found: ${effectiveCompanyId}`
      }
    }

    if (!user) {
      console.error('[Whop Auth] User not found:', userId)
      return {
        success: false,
        error: `User not found: ${userId}`
      }
    }

    // Optionally check access if required (for sensitive operations)
    // Note: This requires a valid WHOP_API_KEY to be set
    let access = null
    if (requireAccess) {
      console.log('[Whop Auth] Checking company access...')

      // Skip access check if API key is not properly configured
      if (!process.env.WHOP_API_KEY) {
        console.warn('[Whop Auth] ⚠️ WHOP_API_KEY not set, skipping access check')
        console.warn('[Whop Auth] Any authenticated Whop user will be allowed')
      } else {
        access = await whopsdk.users.checkAccess(effectiveCompanyId, { id: userId }).catch((err) => {
          console.error('[Whop Auth] Failed to check access:', err)
          console.warn('[Whop Auth] ⚠️ Access check failed, but allowing user (graceful degradation)')
          return null
        })

        console.log('[Whop Auth] Access check result:', {
          userId,
          companyId: effectiveCompanyId,
          hasAccess: access?.has_access,
          accessLevel: (access as any)?.access_level,
          fullAccessObject: access
        })

        if (!access || !access.has_access) {
          console.error('[Whop Auth] ❌ ACCESS DENIED:', {
            userId,
            companyId: effectiveCompanyId,
            hasAccess: access?.has_access,
            accessObject: access,
            reason: !access ? 'Access object is null/undefined' : 'has_access is false'
          })
          return {
            success: false,
            error: `User ${userId} does not have access to company ${effectiveCompanyId}`
          }
        }
      }
    }

    // Determine role - default to member (more restrictive) for security
    // In Whop apps, if you can access the app, you're either an admin or customer
    // We'll check access level to determine the actual role
    console.log('[Whop Auth] Determining user role...')
    let role: UserRole = 'member' // Default to member for security

    // Try to determine role more accurately if possible
    try {
      role = await determineUserRole(userId, effectiveCompanyId, access, requireAccess)
    } catch (error) {
      console.warn('[Whop Auth] Role determination failed, defaulting to admin:', error)
    }

    console.log('[Whop Auth] User role determined:', role)

    console.log('[Whop Auth] ✅ Authentication successful:', {
      userId,
      companyId: effectiveCompanyId,
      role,
      email: (user as any).email,
      name: (user as any).username,
      requireAccessCheckPassed: requireAccess
    })

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
    console.error('[Whop Auth] ❌ Unexpected error during verification:', error)
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
  access: any,
  accessWasChecked: boolean = false
): Promise<UserRole> {
  try {
    console.log('[Whop Auth] Determining role for user:', userId, 'in company:', companyId)

    // Check if user is in the admin override list (temporary solution)
    const adminOverride = process.env.WHOP_ADMIN_USERS?.split(',').map(id => id.trim()).includes(userId)
    if (adminOverride) {
      console.log('[Whop Auth] ✅ User in WHOP_ADMIN_USERS override list → admin role')
      return 'admin'
    }

    // Check if user is company owner
    const company = await whopsdk.companies.retrieve(companyId).catch(err => {
      console.error('[Whop Auth] Failed to retrieve company for owner check:', err)
      return null
    })

    if (company) {
      console.log('[Whop Auth] Company owner_id:', (company as any).owner_id, 'vs userId:', userId)

      // If user owns the company, they're an admin
      if ((company as any).owner_id === userId) {
        console.log('[Whop Auth] ✅ User is company owner → admin role')
        return 'admin'
      }
    } else {
      console.warn('[Whop Auth] Could not retrieve company for owner check')
    }

    // If access wasn't checked yet, perform the check now to determine role accurately
    if (!access && !accessWasChecked) {
      console.log('[Whop Auth] Access not checked yet - performing access check to determine role')

      // Only perform check if API key is configured
      if (process.env.WHOP_API_KEY) {
        try {
          access = await whopsdk.users.checkAccess(companyId, { id: userId })
          console.log('[Whop Auth] Access check for role determination:', {
            access_level: (access as any)?.access_level,
            has_access: access?.has_access
          })
        } catch (error) {
          console.warn('[Whop Auth] Failed to check access for role determination:', error)
          console.warn('[Whop Auth] Defaulting to member role for security')
          return 'member'
        }
      } else {
        console.warn('[Whop Auth] ⚠️ WHOP_API_KEY not set, cannot determine role accurately')
        console.warn('[Whop Auth] Defaulting to member role for security')
        return 'member'
      }
    }

    // Check for admin-level permissions in access object if provided
    // According to Whop docs, access_level can be: "customer", "admin", or "no_access"
    // Admin access_level means the user is a team member of the company
    if (access) {
      console.log('[Whop Auth] Checking access object for admin permissions:', {
        access_level: (access as any).access_level,
        has_access: access.has_access
      })

      // Check if user has admin access_level (team member)
      if ((access as any).access_level === 'admin') {
        console.log('[Whop Auth] ✅ User has admin access_level → admin role')
        return 'admin'
      }

      // If access level is explicitly 'customer', respect that
      if ((access as any).access_level === 'customer') {
        console.log('[Whop Auth] ℹ️ User has customer access_level → member role')
        return 'member'
      }
    }

    // For Whop apps: default to member role for security
    // Only grant admin role if explicitly verified above
    console.log('[Whop Auth] ℹ️ No explicit role determined - defaulting to member role for security')
    return 'member'
  } catch (error) {
    console.error('[Whop Auth] Error determining user role:', error)
    return 'member' // Default to more restrictive role on error
  }
}

/**
 * Wrapper function that verifies Whop authentication and throws if unauthorized
 * Use this in API routes that require authentication
 * @param companyId - The company ID to check access for
 * @param requireAccess - Whether to require company access check (default: false)
 */
export async function requireWhopAuth(companyId: string, requireAccess = false): Promise<WhopAuthUser> {
  const result = await verifyWhopUser(companyId, requireAccess)

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
