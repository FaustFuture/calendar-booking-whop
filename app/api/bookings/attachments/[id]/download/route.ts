import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireWhopAuth, syncWhopUserToSupabase } from '@/lib/auth/whop'

// GET /api/bookings/attachments/[id]/download - Download attachment file
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const attachmentId = params.id
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const whopUser = await requireWhopAuth(companyId, true)
    await syncWhopUserToSupabase(whopUser)

    const supabase = await createClient()

    // Fetch attachment metadata
    const { data: attachment, error: attachmentError } = await supabase
      .from('booking_attachments')
      .select(`
        *,
        booking:bookings(id, member_id, company_id)
      `)
      .eq('id', attachmentId)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Verify user has permission
    if (whopUser.role === 'member' && attachment.booking.member_id !== whopUser.userId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only download attachments from your own bookings' },
        { status: 403 }
      )
    }

    // Verify company matches
    if (attachment.booking.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden - Attachment does not belong to this company' },
        { status: 403 }
      )
    }

    // Create service role client for storage operations (bypasses RLS)
    const storageClient = createServiceRoleClient()

    // Extract just the file path (remove bucket name prefix if present)
    const filePath = attachment.file_path.replace(/^booking-attachments\//, '')

    // Download file from Supabase Storage using service role client
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from('booking-attachments')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      )
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
        'Content-Length': attachment.file_size.toString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

