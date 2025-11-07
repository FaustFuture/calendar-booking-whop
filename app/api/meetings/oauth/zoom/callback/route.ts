/**
 * Zoom OAuth Callback Endpoint
 * GET /api/meetings/oauth/zoom/callback
 * Handles the OAuth callback from Zoom
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { zoomService } from '@/lib/services/zoomService'

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

    // Use userId directly (from Whop authentication)

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
        console.error('Failed to update OAuth connection:', updateError)
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
        console.error('Failed to create OAuth connection:', insertError)
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
    console.error('Zoom OAuth callback error:', error)
    // Try to extract companyId from URL state parameter for error redirect
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')
    let companyId: string | undefined
    if (state) {
      const stateParts = state.split(':')
      companyId = stateParts[1]
    }
    const errorUrl = companyId
      ? `/auth/oauth-error?error=${encodeURIComponent('callback_failed')}&provider=zoom&companyId=${companyId}`
      : `/auth/oauth-error?error=${encodeURIComponent('callback_failed')}&provider=zoom`
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }
}
