'use client'

import { useEffect, useState } from 'react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueueStats {
  active: number
  waiting: number
  completed: number
  failed: number
}

interface Job {
  id: string | number
  type: 'image' | 'video'
  prompt: string
  progress?: number
  timestamp: number
}

interface QueueStatus {
  queues: {
    image: QueueStats
    video: QueueStats
  }
  userJobs: {
    active: Job[]
    waiting: Job[]
  }
}

export function QueueStatusPanel() {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/queue/status')
        if (!response.ok) throw new Error('Failed to fetch queue status')
        const data = await response.json()
        setStatus(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </Card>
    )
  }

  if (!status) return null

  const totalActive = status.queues.image.active + status.queues.video.active
  const totalWaiting = status.queues.image.waiting + status.queues.video.waiting

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        Queue Status
      </h3>

      {/* Global Queue Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{totalActive}</span>
          <span className="text-sm text-muted-foreground">Active Jobs</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold">{totalWaiting}</span>
          <span className="text-sm text-muted-foreground">Waiting Jobs</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-[hsl(var(--success))]">
            {status.queues.image.completed + status.queues.video.completed}
          </span>
          <span className="text-sm text-muted-foreground">Completed</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-destructive">
            {status.queues.image.failed + status.queues.video.failed}
          </span>
          <span className="text-sm text-muted-foreground">Failed</span>
        </div>
      </div>

      {/* Per-Queue Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Image Queue</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Active: {status.queues.image.active}</div>
            <div>Waiting: {status.queues.image.waiting}</div>
          </div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Video Queue</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Active: {status.queues.video.active}</div>
            <div>Waiting: {status.queues.video.waiting}</div>
          </div>
        </div>
      </div>

      {/* User's Active Jobs */}
      {status.userJobs.active.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Your Active Jobs ({status.userJobs.active.length})
          </h4>
          <div className="space-y-2">
            {status.userJobs.active.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1">
                    {job.type}
                  </Badge>
                  <p className="text-sm truncate">{job.prompt}</p>
                </div>
                {job.progress !== undefined && (
                  <div className="ml-2 text-xs text-muted-foreground">
                    {job.progress}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's Waiting Jobs */}
      {status.userJobs.waiting.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Your Queued Jobs ({status.userJobs.waiting.length})
          </h4>
          <div className="space-y-2">
            {status.userJobs.waiting.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-1">
                    {job.type}
                  </Badge>
                  <p className="text-sm truncate">{job.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status.userJobs.active.length === 0 && status.userJobs.waiting.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No active jobs</p>
        </div>
      )}
    </Card>
  )
}
