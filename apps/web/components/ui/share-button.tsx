'use client'

import { useState } from 'react'
import { Share2, Globe, Lock } from 'lucide-react'
import { Button } from './button'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  generationId: string
  initialIsPublic?: boolean
  variant?: 'icon' | 'default'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  className?: string
  onShareChange?: (isPublic: boolean) => void
}

export function ShareButton({
  generationId,
  initialIsPublic = false,
  variant = 'icon',
  size = 'icon',
  className,
  onShareChange,
}: ShareButtonProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleShare = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/generations/${generationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update share status')
      }

      setIsPublic(data.isPublic)
      onShareChange?.(data.isPublic)
      toast.success(data.message || (data.isPublic ? 'Shared to gallery' : 'Removed from gallery'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update share status')
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="secondary"
        size={size}
        onClick={handleToggleShare}
        disabled={isLoading}
        className={cn(className)}
        title={isPublic ? 'Remove from gallery' : 'Share to gallery'}
      >
        {isPublic ? (
          <Globe className="h-4 w-4 text-primary" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={isPublic ? 'default' : 'outline'}
      size={size}
      onClick={handleToggleShare}
      disabled={isLoading}
      className={cn(className)}
    >
      {isPublic ? (
        <>
          <Globe className="h-4 w-4 mr-2" />
          Public
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          Share to Gallery
        </>
      )}
    </Button>
  )
}
