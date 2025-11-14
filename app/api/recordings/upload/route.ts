import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

// Route configuration for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large uploads
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Parse FormData - Next.js should handle this automatically
    // Note: Vercel has a 4.5MB limit for serverless functions
    // For larger files, consider using direct Supabase client-side uploads
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error('FormData parse error:', parseError)
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError)
      
      // Check if it's a body size issue
      if (errorMessage.includes('body') || errorMessage.includes('size') || errorMessage.includes('limit')) {
        return NextResponse.json(
          { 
            error: 'File too large for server upload',
            message: 'Files larger than 4.5MB cannot be uploaded through the API route. Please use a direct client-side upload to Supabase Storage instead.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          },
          { status: 413 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to parse FormData',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 400 }
      )
    }
    const companyId = formData.get('companyId') as string
    const bookingId = formData.get('bookingId') as string | null
    const title = formData.get('title') as string
    const file = formData.get('file') as File

    if (!companyId || !title || !file) {
      return NextResponse.json(
        { error: 'companyId, title, and file are required' },
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

    // Validate file type (video files only)
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ]
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB for recordings)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
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

    // Generate unique file path
    const fileExtForPath = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const filePath = `${companyId}/${timestamp}-${randomId}.${fileExtForPath}`

    // Check if bucket exists, if not return helpful error
    const { data: buckets, error: bucketsError } = await storageClient.storage.listBuckets()
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
    }
    
    const recordingsBucket = buckets?.find(b => b.name === 'recordings')
    if (!recordingsBucket) {
      return NextResponse.json(
        { 
          error: 'Storage bucket not found',
          message: 'The "recordings" bucket does not exist in Supabase Storage. Please create it in your Supabase dashboard.',
          details: process.env.NODE_ENV === 'development' ? 'Go to Supabase Dashboard > Storage > Create bucket named "recordings" and set it to public.' : undefined
        },
        { status: 500 }
      )
    }

    // Upload to Supabase Storage using service role client (bypasses RLS)
    // Use File directly (same as booking attachments)
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('recordings')
      .upload(filePath, file, {
        contentType: file.type || 'video/mp4',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { 
          error: `Failed to upload file: ${uploadError.message}`,
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(uploadError) : undefined
        },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded file
    const { data: urlData } = storageClient.storage
      .from('recordings')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Save recording metadata to database
    const recordingData = {
      title,
      url: publicUrl,
      playback_url: publicUrl, // Use same URL for playback
      provider: 'manual' as const,
      status: 'available' as const,
      recording_type: 'local' as const, // Stored locally in Supabase
      auto_fetched: false,
      file_size: file.size,
      company_id: companyId,
      ...(bookingId && { booking_id: bookingId }),
    }

    const { data: recording, error: dbError } = await supabase
      .from('recordings')
      .insert(recordingData)
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to delete the uploaded file if database insert fails
      try {
        await storageClient.storage.from('recordings').remove([filePath])
      } catch (deleteError) {
        console.error('Failed to delete uploaded file after DB error:', deleteError)
      }
      return NextResponse.json(
        { 
          error: `Failed to save recording: ${dbError.message}`,
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(dbError) : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Recording uploaded successfully',
      data: recording,
    })
  } catch (error) {
    console.error('Recording upload error:', error)
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

