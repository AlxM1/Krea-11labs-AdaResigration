import { NextRequest, NextResponse } from 'next/server'
import { imageQueue, videoQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'personal-user'

    // Get queue counts
    const [
      imageActive,
      imageWaiting,
      imageCompleted,
      imageFailed,
      videoActive,
      videoWaiting,
      videoCompleted,
      videoFailed,
    ] = await Promise.all([
      imageQueue.getActiveCount(),
      imageQueue.getWaitingCount(),
      imageQueue.getCompletedCount(),
      imageQueue.getFailedCount(),
      videoQueue.getActiveCount(),
      videoQueue.getWaitingCount(),
      videoQueue.getCompletedCount(),
      videoQueue.getFailedCount(),
    ])

    // Get active jobs for current user
    const [imageActiveJobs, videoActiveJobs] = await Promise.all([
      imageQueue.getActive(),
      videoQueue.getActive(),
    ])

    // Filter by user
    const userImageJobs = imageActiveJobs.filter(job => job.data.userId === userId)
    const userVideoJobs = videoActiveJobs.filter(job => job.data.userId === userId)

    // Get waiting jobs for current user
    const [imageWaitingJobs, videoWaitingJobs] = await Promise.all([
      imageQueue.getWaiting(),
      videoQueue.getWaiting(),
    ])

    const userImageWaiting = imageWaitingJobs.filter(job => job.data.userId === userId)
    const userVideoWaiting = videoWaitingJobs.filter(job => job.data.userId === userId)

    return NextResponse.json({
      queues: {
        image: {
          active: imageActive,
          waiting: imageWaiting,
          completed: imageCompleted,
          failed: imageFailed,
        },
        video: {
          active: videoActive,
          waiting: videoWaiting,
          completed: videoCompleted,
          failed: videoFailed,
        },
      },
      userJobs: {
        active: [
          ...userImageJobs.map(job => ({
            id: job.id,
            type: 'image',
            prompt: job.data.prompt,
            progress: job.progress,
            timestamp: job.timestamp,
          })),
          ...userVideoJobs.map(job => ({
            id: job.id,
            type: 'video',
            prompt: job.data.prompt,
            progress: job.progress,
            timestamp: job.timestamp,
          })),
        ],
        waiting: [
          ...userImageWaiting.map(job => ({
            id: job.id,
            type: 'image',
            prompt: job.data.prompt,
            timestamp: job.timestamp,
          })),
          ...userVideoWaiting.map(job => ({
            id: job.id,
            type: 'video',
            prompt: job.data.prompt,
            timestamp: job.timestamp,
          })),
        ],
      },
    })
  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    )
  }
}
