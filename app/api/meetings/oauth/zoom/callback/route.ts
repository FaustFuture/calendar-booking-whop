/**
 * Zoom OAuth Callback Endpoint
 * GET /api/meetings/oauth/zoom/callback
 * Handles the OAuth callback from Zoom
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { zoomService } from '@/lib/services/zoomService'
import { syncWhopUserToSupabase, requireWhopAuth } from '@/lib/auth/whop'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Try to extract companyId from state for error redirects
    let companyId: string | undefined
    if (state) {
      const stateParts = state.split(':')
      companyId = stateParts[1]
    }

    // Handle OAuth errors
    if (error) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=${encodeURIComponent(error)}&provider=zoom&companyId=${companyId}`
        : `/auth/oauth-error?error=${encodeURIComponent(error)}&provider=zoom`
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    if (!code || !state) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=missing_parameters&provider=zoom&companyId=${companyId}`
        : '/auth/oauth-error?error=missing_parameters&provider=zoom'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    // Verify state parameter (extract user ID and company ID)
    // State format: userId:companyId:timestamp:random
    const stateParts = state.split(':')
    const userId = stateParts[0]
    companyId = stateParts[1]

    if (!userId || !companyId) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=invalid_state&provider=zoom&companyId=${companyId}`
        : '/auth/oauth-error?error=invalid_state&provider=zoom'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    const supabase = await createClient()

    // Verify user exists in Supabase (required for foreign key constraint)
    // Try to get user from Supabase first
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // If user doesn't exist, try to sync from Whop
    if (!existingUser || userCheckError) {
      try {
        const whopUser = await requireWhopAuth(companyId, true)
        await syncWhopUserToSupabase(whopUser)
        
        // Verify userId matches
        if (whopUser.userId !== userId) {
          const errorUrl = companyId
            ? `/auth/oauth-error?error=invalid_user&provider=zoom&companyId=${companyId}`
            : `/auth/oauth-error?error=invalid_user&provider=zoom`
          return NextResponse.redirect(new URL(errorUrl, request.url))
        }
      } catch (authError) {
        const errorUrl = companyId
          ? `/auth/oauth-error?error=user_not_found&provider=zoom&companyId=${companyId}&message=User not found. Please ensure you are logged in and try again.`
          : `/auth/oauth-error?error=user_not_found&provider=zoom&message=User not found. Please ensure you are logged in and try again.`
        return NextResponse.redirect(new URL(errorUrl, request.url))
      }
    }

    // Exchange code for tokens
    const tokens = await zoomService.exchangeCodeForTokens(code)

    // Get user info from Zoom
    const userInfo = await zoomService.getUserInfo(tokens.access_token)

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('oauth_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'zoom')
      .single()

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('oauth_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scope: tokens.scope,
          provider_user_id: userInfo.id,
          provider_email: userInfo.email,
          is_active: true,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)

      if (updateError) {
        return NextResponse.redirect(
          new URL(
            `/dashboard/${companyId}/settings/integrations?error=database_error&provider=zoom`,
            request.url
          )
        )
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('oauth_connections')
        .insert({
          user_id: userId,
          provider: 'zoom',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_at: expiresAt,
          scope: tokens.scope,
          provider_user_id: userInfo.id,
          provider_email: userInfo.email,
          is_active: true,
        })

      if (insertError) {
        return NextResponse.redirect(
          new URL(
            `/dashboard/${companyId}/settings/integrations?error=database_error&provider=zoom`,
            request.url
          )
        )
      }
    }

    // Redirect to OAuth success page with companyId
    return NextResponse.redirect(
      new URL(`/auth/oauth-success?provider=zoom&companyId=${companyId}`, request.url)
    )
  } catch (error) {
    // Try to extract companyId from URL state parameter for error redirect
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    let companyId: string | undefined
    if (state) {
      const stateParts = state.split(':')
      companyId = stateParts[1]
    }
    
    // Determine specific error type
    let errorType = 'callback_failed'
    let errorMessage = 'OAuth callback failed'
    
    if (error instanceof Error) {
      if (error.message.includes('exchange')) {
        errorType = 'token_exchange_failed'
        errorMessage = 'Failed to exchange authorization code for tokens'
      } else if (error.message.includes('user info') || error.message.includes('getUserInfo')) {
        errorType = 'user_info_failed'
        errorMessage = 'Failed to retrieve user information from Zoom'
      } else if (error.message.includes('database') || error.message.includes('insert') || error.message.includes('update')) {
        errorType = 'database_error'
        errorMessage = 'Failed to save OAuth connection to database'
      } else if (error.message.includes('user_id') || error.message.includes('user not found')) {
        errorType = 'user_not_found'
        errorMessage = 'User not found in database. Please ensure you are logged in.'
      }
    }
    
    const errorUrl = companyId
      ? `/auth/oauth-error?error=${encodeURIComponent(errorType)}&provider=zoom&companyId=${companyId}&message=${encodeURIComponent(errorMessage)}`
      : `/auth/oauth-error?error=${encodeURIComponent(errorType)}&provider=zoom&message=${encodeURIComponent(errorMessage)}`
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }
}
