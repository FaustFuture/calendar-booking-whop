import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/meetings/check - Check OAuth connection status
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '00000000-0000-0000-0000-000000000001'

    // Check for Zoom connection
    const { data: zoomConnection, error: zoomError } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'zoom')
      .eq('is_active', true)
      .single()

    // Check for Google connection
    const { data: googleConnection, error: googleError } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    // Check environment variables
    const envCheck = {
      zoom: {
        clientId: !!process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID,
        clientSecret: !!process.env.ZOOM_CLIENT_SECRET,
        redirectUri: !!process.env.ZOOM_REDIRECT_URI,
      },
      google: {
        clientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      },
    }

    return NextResponse.json({
      userId,
      connections: {
        zoom: zoomConnection ? {
          exists: true,
          active: zoomConnection.is_active,
          expiresAt: zoomConnection.expires_at,
          expired: new Date(zoomConnection.expires_at) < new Date(),
          hasRefreshToken: !!zoomConnection.refresh_token,
          lastUsed: zoomConnection.last_used_at,
        } : {
          exists: false,
          error: zoomError?.message,
        },
        google: googleConnection ? {
          exists: true,
          active: googleConnection.is_active,
          expiresAt: googleConnection.expires_at,
          expired: new Date(googleConnection.expires_at) < new Date(),
          hasRefreshToken: !!googleConnection.refresh_token,
          lastUsed: googleConnection.last_used_at,
        } : {
          exists: false,
          error: googleError?.message,
        },
      },
      environment: envCheck,
    })
  } catch (error) {
    console.error('Error checking OAuth status:', error)
    return NextResponse.json(
      { error: 'Failed to check OAuth status', details: error },
      { status: 500 }
    )
  }
}
