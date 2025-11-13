/**
 * Google OAuth Callback Endpoint
 * GET /api/meetings/oauth/google/callback
 * Handles the OAuth callback from Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleMeetService } from '@/lib/services/googleMeetService'

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Google OAuth callback received')
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('📥 Callback parameters:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      error: error || null,
    })

    // Try to extract companyId from state for error redirects
    let companyId: string | undefined
    if (state) {
      const stateParts = state.split(':')
      companyId = stateParts[1]
      console.log('📥 Extracted companyId from state:', companyId)
    }

    // Handle OAuth errors
    if (error) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=${encodeURIComponent(error)}&provider=google&companyId=${companyId}`
        : `/auth/oauth-error?error=${encodeURIComponent(error)}&provider=google`
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    if (!code || !state) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=missing_parameters&provider=google&companyId=${companyId}`
        : '/auth/oauth-error?error=missing_parameters&provider=google'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    // Verify state parameter (extract user ID and company ID)
    // State format: userId:companyId:timestamp:random
    const stateParts = state.split(':')
    const userId = stateParts[0]
    companyId = stateParts[1]

    if (!userId || !companyId) {
      const errorUrl = companyId
        ? `/auth/oauth-error?error=invalid_state&provider=google&companyId=${companyId}`
        : '/auth/oauth-error?error=invalid_state&provider=google'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    const supabase = await createClient()

    // Use userId directly (from Whop authentication)

    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...')
    let tokens
    try {
      tokens = await googleMeetService.exchangeCodeForTokens(code)
      console.log('✅ Token exchange successful')
    } catch (error) {
      console.error('❌ Token exchange failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      return NextResponse.redirect(
        new URL(
          `/auth/oauth-error?error=token_exchange_failed&provider=google&companyId=${companyId}&message=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      )
    }

    // Get user info from Google
    console.log('🔄 Getting user info from Google...')
    let userInfo
    try {
      userInfo = await googleMeetService.getUserInfo(tokens.access_token)
      console.log('✅ User info retrieved:', { email: userInfo.email, id: userInfo.id })
    } catch (error) {
      console.error('❌ Failed to get user info:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      return NextResponse.redirect(
        new URL(
          `/auth/oauth-error?error=user_info_failed&provider=google&companyId=${companyId}&message=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      )
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Check if connection already exists
    console.log('🔄 Checking for existing OAuth connection for user:', userId)
    const { data: existingConnection, error: connectionCheckError } = await supabase
      .from('oauth_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle()

    if (connectionCheckError && connectionCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing connection:', connectionCheckError)
    }

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
        console.error('Failed to update OAuth connection:', updateError)
        return NextResponse.redirect(
          new URL(
            `/dashboard/${companyId}/settings/integrations?error=database_error&provider=google`,
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
          provider: 'google',
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
        console.error('Failed to create OAuth connection:', insertError)
        return NextResponse.redirect(
          new URL(
            `/dashboard/${companyId}/settings/integrations?error=database_error&provider=google`,
            request.url
          )
        )
      }
    }

    // Redirect to OAuth success page with companyId
    return NextResponse.redirect(
      new URL(`/auth/oauth-success?provider=google&companyId=${companyId}`, request.url)
    )
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error)
    
    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    }
    console.error('❌ Error details:', JSON.stringify(errorDetails, null, 2))
    
    // Try to extract companyId from URL state parameter for error redirect
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    let companyId: string | undefined
    if (state) {
      const stateParts = state.split(':')
      companyId = stateParts[1]
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorUrl = companyId
      ? `/auth/oauth-error?error=${encodeURIComponent('callback_failed')}&provider=google&companyId=${companyId}&message=${encodeURIComponent(errorMessage)}`
      : `/auth/oauth-error?error=${encodeURIComponent('callback_failed')}&provider=google&message=${encodeURIComponent(errorMessage)}`
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }
}
