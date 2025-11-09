import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireWhopAuth } from '@/lib/auth/whop'

// GET /api/meetings/check - Check OAuth connection status
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const userId = searchParams.get('userId')

    // If companyId provided, get authenticated user
    let authenticatedUserId: string | null = null
    if (companyId) {
      try {
        const whopUser = await requireWhopAuth(companyId, true)
        authenticatedUserId = whopUser.userId
      } catch (error) {
        console.error('Auth error in check endpoint:', error)
      }
    }

    const checkUserId = authenticatedUserId || userId || '00000000-0000-0000-0000-000000000001'

    // Zoom now uses Server-to-Server OAuth (no user connection stored)

    // Check environment variables
    // Zoom now uses Server-to-Server OAuth (no user connection needed)
    const zoomConfigured = !!(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET)
    
    const envCheck = {
      zoom: {
        accountId: !!process.env.ZOOM_ACCOUNT_ID,
        clientId: !!process.env.ZOOM_CLIENT_ID,
        clientSecret: !!process.env.ZOOM_CLIENT_SECRET,
        configured: zoomConfigured,
      },
    }

    return NextResponse.json({
      userId: checkUserId,
      connections: {
        zoom: zoomConfigured ? {
          exists: true,
          active: true,
          type: 'server-to-server',
          configured: true,
          // Server-to-Server doesn't use stored connections
        } : {
          exists: false,
          configured: false,
          error: 'Zoom Server-to-Server OAuth not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET',
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
