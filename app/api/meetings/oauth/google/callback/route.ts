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
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings/integrations?error=missing_parameters',
          request.url
        )
      )
    }

    // Verify state parameter (extract user ID)
    const userId = state.split(':')[0]
    if (!userId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=invalid_state', request.url)
      )
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=unauthorized', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await googleMeetService.exchangeCodeForTokens(code)

    // Get user info from Google
    const userInfo = await googleMeetService.getUserInfo(tokens.access_token)

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('oauth_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
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
            '/dashboard/settings/integrations?error=database_error',
            request.url
          )
        )
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('oauth_connections')
        .insert({
          user_id: user.id,
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
            '/dashboard/settings/integrations?error=database_error',
            request.url
          )
        )
      }
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard/settings/integrations?success=google', request.url)
    )
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/integrations?error=${encodeURIComponent('callback_failed')}`,
        request.url
      )
    )
  }
}
