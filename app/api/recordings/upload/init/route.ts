import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

export async function POST(request: Request) {
  try {
    // Accept JSON for init request (no file in body to avoid size limits)
    const body = await request.json()
    const { companyId, bookingId, title, fileName, fileSize, fileType } = body

    if (!companyId || !title || !fileName) {
      return NextResponse.json(
        { error: 'companyId, title, and fileName are required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const whopUser = await requireWhopAuth(companyId, true)
    await syncWhopUserToSupabase(whopUser)

    // Only admins can upload recordings
    if (whopUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const storageClient = createServiceRoleClient()

    // Verify booking exists if bookingId is provided
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, company_id')
        .eq('id', bookingId)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }

      // Verify company matches
      if (booking.company_id !== companyId) {
        return NextResponse.json(
          { error: 'Forbidden - Booking does not belong to this company' },
          { status: 403 }
        )
      }
    }

    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ]
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    const fileExt = '.' + fileName.split('.').pop()?.toLowerCase()
    
    if (fileType && !allowedTypes.includes(fileType) && !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      )
    }

    // Check if bucket exists
    const { data: buckets } = await storageClient.storage.listBuckets()
    const recordingsBucket = buckets?.find(b => b.name === 'recordings')
    if (!recordingsBucket) {
      return NextResponse.json(
        { 
          error: 'Storage bucket not found',
          message: 'The "recordings" bucket does not exist in Supabase Storage. Please create it in your Supabase dashboard.',
        },
        { status: 500 }
      )
    }

    // Generate unique file path
    const fileExtForPath = fileName.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const filePath = `${companyId}/${timestamp}-${randomId}.${fileExtForPath}`

    // Return file path for client-side upload
    // Client will upload directly to Supabase Storage, then call /api/recordings/upload/complete
    return NextResponse.json({
      filePath,
      message: 'Upload path generated',
    })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

