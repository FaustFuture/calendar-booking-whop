/**
 * Test Notification Endpoint
 * Manually test notification sending
 * GET /api/notifications/test?companyId=biz_xxx&userId=user_xxx
 */

import { NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notificationService'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const userId = searchParams.get('userId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const whopUser = await requireWhopAuth(companyId, true)
    await syncWhopUserToSupabase(whopUser)

    const testUserId = userId || whopUser.userId

    // Test sending to specific user
    if (testUserId) {
      try {
        await notificationService.sendNotificationToUser(
          testUserId,
          companyId,
          'Test Notification',
          'This is a test notification to verify the API is working correctly.',
          '/dashboard',
          false
        )
        return NextResponse.json({
          success: true,
          message: `Test notification sent to user ${testUserId}`,
        })
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    }

    // Test sending to all admins
    try {
      await notificationService.sendNotificationToAdmins(
        companyId,
        'Test Notification',
        'This is a test notification to verify the API is working correctly.',
        '/dashboard',
        false
      )
      return NextResponse.json({
        success: true,
        message: `Test notification sent to all admins in company ${companyId}`,
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

