'use client'

import { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { exportImage, type ExportFormat } from '@/lib/utils/export'
import toast from 'react-hot-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface DownloadButtonProps {
  imageUrl: string
  filename?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

const formats: Array<{ value: ExportFormat; label: string; quality?: number }> = [
  { value: 'png', label: 'PNG (Lossless)' },
  { value: 'jpg', label: 'JPG (High Quality)', quality: 0.95 },
  { value: 'webp', label: 'WebP (Smaller)', quality: 0.95 },
]

export function DownloadButton({
  imageUrl,
  filename,
  variant = 'secondary',
  size = 'icon',
  className,
}: DownloadButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleDownload = async (format: ExportFormat, quality?: number) => {
    setIsExporting(true)
    try {
      await exportImage(imageUrl, {
        format,
        quality,
        filename,
      })
      toast.success(`Downloaded as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download image')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          {size !== 'icon' && <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format.value}
            onClick={() => handleDownload(format.value, format.quality)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
