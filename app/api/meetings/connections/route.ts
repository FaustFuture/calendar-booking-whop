/**
 * OAuth Connections Endpoint
 * GET /api/meetings/connections
 * Returns all active OAuth connections for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhopUserFromHeaders } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId')

    // Require companyId for Whop multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Get authenticated Whop user
    const whopUser = await getWhopUserFromHeaders()
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all active connections
    const { data: connections, error } = await supabase
      .from('oauth_connections')
      .select('id, provider, provider_email, is_active, created_at, last_used_at')
      .eq('user_id', whopUser.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch connections:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      )
    }

    return NextResponse.json({ connections: connections || [] })
  } catch (error) {
    console.error('Connections endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
