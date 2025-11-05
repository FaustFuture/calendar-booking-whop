'use client'

import { useEffect, useState } from 'react'
import { Video, Upload, Play, Download, Trash2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RecordingWithRelations, User } from '@/lib/types/database'
import { format } from 'date-fns'
import UploadRecordingModal from '../modals/UploadRecordingModal'

interface RecordingsTabProps {
  roleOverride?: 'admin' | 'member'
}

export default function RecordingsTab({ roleOverride }: RecordingsTabProps) {
  const [user, setUser] = useState<User | null>(null)
  const [recordings, setRecordings] = useState<RecordingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadUserAndRecordings()
  }, [roleOverride]) // Refetch when role changes

  async function loadUserAndRecordings() {
    try {
      setLoading(true)

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()

      let userId = authUser?.id
      let userData = null

      // Handle dev mode - use dev admin ID if no auth
      if (!authUser) {
        userId = '00000000-0000-0000-0000-000000000001'
        // Try to get dev user profile
        const { data: devUserData } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        userData = devUserData
      } else {
        // Get user profile for authenticated user
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        userData = profileData
      }

      setUser(userData)

      // Load recordings with booking details
      const { data: recordingsData } = await supabase
        .from('recordings')
        .select(`
          *,
          booking:booking_id(
            id,
            title,
            member_id,
            admin_id,
            member:member_id(id, name, email),
            admin:admin_id(id, name, email)
          )
        `)
        .order('uploaded_at', { ascending: false })

      // Filter recordings based on role
      const effectiveRole = roleOverride || userData?.role || 'admin'

      if (effectiveRole === 'member') {
        // Members only see recordings for their bookings
        const filtered = recordingsData?.filter(
          (rec: RecordingWithRelations) => rec.booking?.member_id === userId
        )
        setRecordings(filtered || [])
      } else {
        // Admins see all recordings
        setRecordings(recordingsData || [])
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteRecording(recordingId: string) {
    if (!confirm('Are you sure you want to delete this recording?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId)

      if (!error) {
        // Reload recordings
        loadUserAndRecordings()
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
    }
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return 'Unknown'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    const gb = bytes / (1024 * 1024 * 1024)

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`
    } else {
      return `${mb.toFixed(2)} MB`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const isAdmin = roleOverride ? roleOverride === 'admin' : user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Recordings</h2>
          <p className="text-zinc-400 mt-1">
            {isAdmin
              ? 'Manage session recordings'
              : 'Access your session recordings'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Recording
          </button>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="card text-center py-12">
          <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No recordings available</p>
          <p className="text-zinc-500 text-sm mt-2">
            {isAdmin
              ? 'Upload recordings to make them available'
              : 'Recordings from your sessions will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {recordings.map((recording) => (
            <div key={recording.id} className="card-hover">
              <div className="flex items-start gap-4">
                {/* Video Thumbnail Placeholder */}
                <div className="w-40 h-24 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-8 h-8 text-zinc-600" />
                </div>

                {/* Recording Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">
                    {recording.title}
                  </h3>

                  {recording.booking && (
                    <p className="text-sm text-zinc-400 mb-2">
                      From: {recording.booking.title}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    {recording.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(recording.duration)}
                      </div>
                    )}
                    {recording.file_size && (
                      <span>{formatFileSize(recording.file_size)}</span>
                    )}
                    <span>
                      {format(new Date(recording.uploaded_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {isAdmin && recording.booking?.member && (
                    <p className="text-xs text-zinc-600 mt-2">
                      Member: {recording.booking.member.name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary p-2"
                    title="Play recording"
                  >
                    <Play className="w-4 h-4" />
                  </a>
                  <a
                    href={recording.url}
                    download
                    className="btn-secondary p-2"
                    title="Download recording"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="btn-ghost p-2 text-red-400 hover:text-red-300"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Recording Modal */}
      {isAdmin && (
        <UploadRecordingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadUserAndRecordings}
        />
      )}
    </div>
  )
}
