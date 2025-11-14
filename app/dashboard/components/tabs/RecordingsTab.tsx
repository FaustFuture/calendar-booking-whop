'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Video, Play, Trash2, Clock, Filter, X, ExternalLink } from 'lucide-react'
import { RecordingWithRelations, RecordingProvider, RecordingStatus } from '@/lib/types/database'
import { format } from 'date-fns'
import { RecordingSkeleton } from '../shared/ListItemSkeleton'
import Drawer from '../shared/Drawer/Drawer'
import DrawerHeader from '../shared/Drawer/DrawerHeader'
import DrawerContent from '../shared/Drawer/DrawerContent'
import DrawerFooter from '../shared/Drawer/DrawerFooter'
import { useConfirm } from '@/lib/context/ConfirmDialogContext'
import { useToast } from '@/lib/context/ToastContext'
import { fetcher } from '@/lib/utils/fetcher'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RecordingsTabProps {
  roleOverride?: 'admin' | 'member'
  companyId: string
}

export default function RecordingsTab({ roleOverride, companyId }: RecordingsTabProps) {
  const confirm = useConfirm()
  const { showSuccess, showError } = useToast()
  const [selectedRecording, setSelectedRecording] = useState<RecordingWithRelations | null>(null)
  const [filterProvider, setFilterProvider] = useState<RecordingProvider | 'all'>('all')

  // Use SWR to fetch recordings
  const { data, error, isLoading, mutate } = useSWR<{ data: RecordingWithRelations[] }>(
    `/api/recordings?companyId=${companyId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const recordings = data?.data || []
  const loading = isLoading

  // Show error if fetch failed
  useEffect(() => {
    if (error) {
      showError('Failed to load recordings', error.message || 'Please try again.')
    }
  }, [error, showError])

  async function deleteRecording(recordingId: string) {
    const confirmed = await confirm.confirm({
      title: 'Delete Recording?',
      message: 'Are you sure you want to delete this recording? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      if (response.ok) {
        showSuccess('Recording Deleted', 'The recording has been deleted successfully.')
        mutate() // Refresh recordings using SWR mutate
      } else {
        const errorData = await response.json()
        showError('Delete Failed', errorData.error || 'Failed to delete the recording.')
      }
    } catch (error) {
      showError('Delete Failed', 'An error occurred while deleting the recording.')
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

  function getProviderBadge(provider: RecordingProvider) {
    const badges: Record<RecordingProvider, { label: string; color: string }> = {
      zoom: { label: 'Zoom', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      manual: { label: 'Manual', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
      google: { label: 'Google Meet', color: 'bg-green-500/10 text-green-400 border-green-500/20' }, // Legacy support
    }
    const badge = badges[provider]
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  function getStatusBadge(status: RecordingStatus) {
    const badges = {
      processing: { label: 'Processing', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      available: { label: 'Available', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      failed: { label: 'Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      deleted: { label: 'Deleted', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    }
    const badge = badges[status]
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  // Filter recordings
  const filteredRecordings = recordings.filter((rec) => {
    if (filterProvider !== 'all' && rec.provider !== filterProvider) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-700 rounded w-64" />
          <div className="h-5 bg-zinc-700 rounded w-96" />
        </div>
        {/* Recordings skeleton */}
        <div className="grid gap-4">
          <RecordingSkeleton />
          <RecordingSkeleton />
          <RecordingSkeleton />
        </div>
      </div>
    )
  }

  const isAdmin = roleOverride === 'admin'

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
      </div>

      {/* Filters */}
      {recordings.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Filter:</span>
          </div>

          {/* Provider Filter */}
          <Select
            value={filterProvider}
            onValueChange={(value) => setFilterProvider(value as RecordingProvider | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {filterProvider !== 'all' && (
            <button
              onClick={() => {
                setFilterProvider('all')
              }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <span className="text-sm text-zinc-500 ml-auto">
            {filteredRecordings.length} of {recordings.length} recordings
          </span>
        </div>
      )}

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="card text-center py-12">
          <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No recordings available</p>
          <p className="text-zinc-500 text-sm mt-2">
            Recordings from your sessions will appear here
          </p>
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="card text-center py-12">
          <Filter className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No recordings match filters</p>
          <button
            onClick={() => {
              setFilterProvider('all')
            }}
            className="text-emerald-400 text-sm mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRecordings.map((recording) => (
            <div key={recording.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800 hover:border-emerald-500/50 transition-colors p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Video className="w-5 h-5 text-emerald-400" />
                  </div>

                  {/* Content - 2 rows */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Title + Booking Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">
                        {recording.title}
                      </h3>
                      {recording.booking?.title && (
                        <span className="text-sm text-zinc-400 truncate">
                          • {recording.booking.title}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Duration, Size, Date */}
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      {recording.duration && (
                        <>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(recording.duration)}
                          </span>
                          <span className="text-zinc-600">•</span>
                        </>
                      )}
                      {recording.file_size && (
                        <>
                          <span>{formatFileSize(recording.file_size)}</span>
                          <span className="text-zinc-600">•</span>
                        </>
                      )}
                      <span>
                        {format(new Date(recording.uploaded_at), 'MMM d, yyyy')}
                      </span>
                      {isAdmin && recording.booking?.member && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="truncate">{recording.booking.member.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setSelectedRecording(recording)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                    title="Watch recording"
                  >
                    <Play className="w-4 h-4" />
                    Watch
                  </button>
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors group/btn"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover/btn:text-white transition-colors" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-red-400 transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Drawer */}
      {selectedRecording && (
        <Drawer open={!!selectedRecording} onClose={() => setSelectedRecording(null)} width="xl">
          <DrawerHeader
            title={selectedRecording.title}
            onClose={() => setSelectedRecording(null)}
          >
            <div className="flex items-center gap-2">
              {getProviderBadge(selectedRecording.provider)}
              {selectedRecording.duration && (
                <span className="text-sm text-zinc-400">
                  {formatDuration(selectedRecording.duration)}
                </span>
              )}
            </div>
          </DrawerHeader>

          <DrawerContent>
            {selectedRecording.playback_url ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={selectedRecording.playback_url}
                  className="absolute inset-0 w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No preview available</p>
                  <a
                    href={selectedRecording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 text-sm hover:underline mt-2 inline-block"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            )}

            {selectedRecording.booking && (
              <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-sm text-zinc-400">
                  Recording for: <span className="text-white font-medium">{selectedRecording.booking.title}</span>
                </div>
              </div>
            )}
          </DrawerContent>

          <DrawerFooter>
            <div className="flex gap-3 w-full">
              <a
                href={selectedRecording.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 flex-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open Link
              </a>
              <button
                onClick={() => setSelectedRecording(null)}
                className="btn-primary flex items-center justify-center gap-2 flex-1"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </DrawerFooter>
        </Drawer>
      )}

    </div>
  )
}
