// Main authentication utilities
export {
  verifyWhopUser,
  requireWhopAuth,
  syncWhopUserToSupabase,
  extractCompanyId,
  getWhopUserFromHeaders,
  type WhopAuthUser,
  type WhopAuthResult
} from './whop'

// Session management
export {
  getWhopSession,
  isAdmin,
  isMember,
  hasRole,
  requireAdmin,
  requireAuth,
  getUserId,
  getCompanyId,
  getRoleBasedFilter
} from './session'
