import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { companyId, bookingId, title, filePath, fileSize } = body

    if (!companyId || !title || !filePath) {
      return NextResponse.json(
        { error: 'companyId, title, and filePath are required' },
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

    // Verify file exists in storage
    const { data: fileData, error: fileError } = await storageClient.storage
      .from('recordings')
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1],
      })

    if (fileError || !fileData || fileData.length === 0) {
      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 404 }
      )
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from('recordings')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Save recording metadata to database
    const recordingData = {
      title,
      url: publicUrl,
      playback_url: publicUrl,
      provider: 'manual' as const,
      status: 'available' as const,
      recording_type: 'local' as const,
      auto_fetched: false,
      file_size: fileSize || null,
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
      return NextResponse.json(
        { 
          error: `Failed to save recording: ${dbError.message}`,
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(dbError) : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Recording saved successfully',
      data: recording,
    })
  } catch (error) {
    console.error('Complete upload error:', error)
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

