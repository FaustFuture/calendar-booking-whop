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
    // Verify WHOP_API_KEY is set for authenticated API calls
    if (!process.env.WHOP_API_KEY) {
      return {
        success: false,
        error: 'Server configuration error: WHOP_API_KEY not set'
      }
    }

    // Get and verify user token from headers
    const headersList = await headers()
    let userId: string | undefined

    try {
      const result = await whopsdk.verifyUserToken(headersList)
      userId = result.userId
    } catch (error) {
      return {
        success: false,
        error: 'Whop user token not found. Please ensure you are accessing this app through the Whop platform.'
      }
    }

    if (!userId) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    if (!companyId) {
      return {
        success: false,
        error: 'Company ID is required'
      }
    }

    const effectiveCompanyId = companyId

    // Fetch user data and company info
    const [company, user] = await Promise.all([
      whopsdk.companies.retrieve(effectiveCompanyId).catch((err) => {
        return null
      }),
      whopsdk.users.retrieve(userId).catch((err) => {
        return null
      })
    ])

    if (!company) {
      return {
        success: false,
        error: `Company not found: ${effectiveCompanyId}`
      }
    }

    if (!user) {
      return {
        success: false,
        error: `User not found: ${userId}`
      }
    }

    // Optionally check access if required (for sensitive operations)
    let access = null
    let accessCheckFailed = false

    if (requireAccess) {
      try {
        access = await whopsdk.users.checkAccess(effectiveCompanyId, { id: userId })

        // Deny access if check succeeded but returned has_access: false
        if (access && !access.has_access) {
          return {
            success: false,
            error: `You do not have access to this company`
          }
        }
      } catch (error) {
        accessCheckFailed = true
      }
    }

    // Determine role - default to member (more restrictive) for security
    // In Whop apps, if you can access the app, you're either an admin or customer
    // We'll check access level to determine the actual role
    let role: UserRole = 'member' // Default to member for security

    // Try to determine role more accurately if possible
    try {
      role = await determineUserRole(userId, effectiveCompanyId, access, requireAccess)
    } catch (error) {
      // Default to member on error
    }

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
    // Check if user is company owner
    const company = await whopsdk.companies.retrieve(companyId).catch(err => {
      return null
    })

    if (company) {
      // If user owns the company, they're an admin
      if ((company as any).owner_id === userId) {
        return 'admin'
      }
    }

    // If access wasn't checked yet, perform the check now to determine role accurately
    if (!access && !accessWasChecked) {
      // Only perform check if API key is configured
      if (process.env.WHOP_API_KEY) {
        try {
          access = await whopsdk.users.checkAccess(companyId, { id: userId })
        } catch (error) {
          return 'member'
        }
      } else {
        return 'member'
      }
    }

    // Check for admin-level permissions in access object if provided
    // According to Whop docs, access_level can be: "customer", "admin", or "no_access"
    // Admin access_level means the user is a team member of the company
    if (access) {

      // Check if user has admin access_level (team member)
      if ((access as any).access_level === 'admin') {
        return 'admin'
      }

      // If access level is explicitly 'customer', respect that
      if ((access as any).access_level === 'customer') {
        return 'member'
      }
    }

    // For Whop apps: default to member role for security
    // Only grant admin role if explicitly verified above
    return 'member'
  } catch (error) {
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
 * @throws Error if sync fails (critical for operations that require user in DB like bookings)
 */
export async function syncWhopUserToSupabase(whopUser: WhopAuthUser): Promise<void> {
  try {
    const supabase = await createClient()


    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', whopUser.userId)
      .single()

    const userData = {
      id: whopUser.userId,
      email: whopUser.email || null, // Email may be null/undefined from Whop
      name: whopUser.name || 'Whop User',
      role: whopUser.role,
      updated_at: new Date().toISOString()
    }

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', whopUser.userId)

      if (updateError) {
        throw new Error(`Failed to update user in database: ${updateError.message}`)
      }

    } else {
      // Insert new user
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        throw new Error(`Failed to insert user into database: ${insertError.message}`)
      }
    }
  } catch (error) {
    // THROW the error - syncing IS critical for operations like bookings
    throw error
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
    return null
  }
}
