import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

// POST /api/bookings/attachments - Upload files for a booking
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const bookingId = formData.get('bookingId') as string
    const companyId = formData.get('companyId') as string
    const files = formData.getAll('files') as File[]

    if (!bookingId || !companyId) {
      return NextResponse.json(
        { error: 'bookingId and companyId are required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Verify authentication
    const whopUser = await requireWhopAuth(companyId, true)
    await syncWhopUserToSupabase(whopUser)

    const supabase = await createClient()

    // Verify booking exists and belongs to the user/company
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, member_id, company_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify user has permission (member can only upload to their own bookings)
    if (whopUser.role === 'member' && booking.member_id !== whopUser.userId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only upload files to your own bookings' },
        { status: 403 }
      )
    }

    // Verify company matches
    if (booking.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden - Booking does not belong to this company' },
        { status: 403 }
      )
    }

    // Store Whop user ID directly (no need to query users table)
    const uploadedBy = whopUser.userId

    // Create service role client for storage operations (bypasses RLS)
    const storageClient = createServiceRoleClient()

    // Upload files to Supabase Storage
    const uploadedAttachments = []
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles: string[] = []

    // Validate all files first
    for (const file of files) {
      if (file.size > maxSize) {
        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      }
    }

    // If any files are too large, return error immediately
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { 
          error: 'File size exceeded',
          message: `The following files exceed the 10MB limit:\n${oversizedFiles.join('\n')}`,
          files: oversizedFiles
        },
        { status: 400 }
      )
    }

    // All files are valid, proceed with upload
    for (const file of files) {

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${bookingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = fileName // Just the file name, bucket is specified in .from()

      // Upload to Supabase Storage using service role client (bypasses RLS)
      const { data: uploadData, error: uploadError } = await storageClient.storage
        .from('booking-attachments')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        continue // Skip this file and continue with others
      }

      // Full path for database storage
      const fullFilePath = `booking-attachments/${filePath}`

      // Save attachment metadata to database
      const { data: attachmentData, error: dbError } = await supabase
        .from('booking_attachments')
        .insert({
          booking_id: bookingId,
          file_name: file.name,
          file_path: fullFilePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: uploadedBy,
        })
        .select()
        .single()

      if (dbError) {
        // Try to delete the uploaded file if database insert fails
        await storageClient.storage.from('booking-attachments').remove([filePath])
        continue
      }

      uploadedAttachments.push(attachmentData)
    }

    if (uploadedAttachments.length === 0) {
      return NextResponse.json(
        { error: 'No files were successfully uploaded' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Successfully uploaded ${uploadedAttachments.length} file(s)`,
      attachments: uploadedAttachments,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

