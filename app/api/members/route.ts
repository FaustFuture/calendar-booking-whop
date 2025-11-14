import { NextResponse } from 'next/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'
import { whopsdk } from '@/lib/whop-sdk'
import { createClient } from '@/lib/supabase/server'

// GET /api/members - List members for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Require companyId for Whop multi-tenancy
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // // Verify Whop authentication and company access
    // const whopUser = await requireWhopAuth(companyId, true)

    // // Sync authenticated user to Supabase
    // await syncWhopUserToSupabase(whopUser)

    // Fetch members from Whop using REST API
    // Documentation: https://docs.whop.com/api-reference/members/list-members
    let allMembers: any[] = []
    
    try {
      // The REST API returns paginated results, so we need to iterate through all pages
      for await (const memberListResponse of whopsdk.members.list({
        company_id: companyId,
        access_level: 'customer', // Only get customers (not admins)
        statuses: ['joined'], // Only get members who have joined
        order: 'created_at',
        direction: 'asc',
      })) {
        if (memberListResponse && memberListResponse.user) {
          allMembers.push(memberListResponse)
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch members from Whop: ${error?.message || 'Unknown error'}`)
    }

    const supabase = await createClient()

    // Map Whop members to our format and sync to Supabase
    const members = await Promise.all(
      allMembers.map(async (member: any) => {
        // Use user.id as the member ID (this is the actual user account ID)
        const userId = member.user?.id || member.id

        // Already filtered by access_level: 'customer' in the API call, but double-check
        if (member.access_level !== 'customer') {
          return null
        }

        // Sync member to Supabase if they have a user account
        if (member.user?.id) {
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', userId)
              .single()

            if (!existingUser) {
              // Insert new user
              await supabase
                .from('users')
                .insert({
                  id: userId,
                  email: member.user.email || null,
                  name: member.user.name || 'Whop User',
                  role: 'member',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
            } else {
              // Update existing user
              await supabase
                .from('users')
                .update({
                  email: member.user.email || null,
                  name: member.user.name || 'Whop User',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
            }
          } catch (error) {
            // Continue even if sync fails - we'll still return the member
          }
        }

        return {
          id: userId,
          name: member.user?.name || 'Unknown User',
          email: member.user?.email || '',
        }
      })
    )

    // Filter out null values (admins that were excluded)
    const filteredMembers = members.filter((m): m is { id: string; name: string; email: string } => m !== null)

    return NextResponse.json({ members: filteredMembers })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

