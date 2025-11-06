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

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/oauth-error?error=${encodeURIComponent(error)}&provider=zoom`,
          request.url
        )
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/auth/oauth-error?error=missing_parameters&provider=zoom',
          request.url
        )
      )
    }

    // Verify state parameter (extract user ID)
    const userId = state.split(':')[0]
    if (!userId) {
      return NextResponse.redirect(
        new URL('/auth/oauth-error?error=invalid_state&provider=zoom', request.url)
      )
    }

    const supabase = await createClient()

    // Determine effective user ID (support dev mode)
    const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'
    let effectiveUserId = userId

    // Verify user is authenticated (skip check for dev mode)
    if (userId !== DEV_USER_ID) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || user.id !== userId) {
        return NextResponse.redirect(
          new URL('/auth/oauth-error?error=unauthorized&provider=zoom', request.url)
        )
      }
      effectiveUserId = user.id
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
      .eq('user_id', effectiveUserId)
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
            '/auth/oauth-error?error=database_error&provider=zoom',
            request.url
          )
        )
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('oauth_connections')
        .insert({
          user_id: effectiveUserId,
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
            '/auth/oauth-error?error=database_error&provider=zoom',
            request.url
          )
        )
      }
    }

    // Redirect to OAuth success page (will auto-close popup)
    return NextResponse.redirect(
      new URL('/auth/oauth-success?provider=zoom', request.url)
    )
  } catch (error) {
    console.error('Zoom OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/auth/oauth-error?error=${encodeURIComponent('callback_failed')}&provider=zoom`,
        request.url
      )
    )
  }
}
