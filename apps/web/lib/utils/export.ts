/**
 * Export utilities for image format conversion and download
 */

export type ExportFormat = 'png' | 'jpg' | 'webp'

interface ExportOptions {
  format?: ExportFormat
  quality?: number // 0-1, for jpg/webp
  filename?: string
}

/**
 * Convert image URL to different format and trigger download
 */
export async function exportImage(
  imageUrl: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    format = 'png',
    quality = 0.95,
    filename = `image-${Date.now()}`,
  } = options

  try {
    // Load image
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl
    })

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Draw image
    ctx.drawImage(img, 0, 0)

    // Convert to desired format
    let mimeType: string
    let extension: string

    switch (format) {
      case 'webp':
        mimeType = 'image/webp'
        extension = 'webp'
        break
      case 'jpg':
        mimeType = 'image/jpeg'
        extension = 'jpg'
        break
      case 'png':
      default:
        mimeType = 'image/png'
        extension = 'png'
        break
    }

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        mimeType,
        quality
      )
    })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cleanup
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}

/**
 * Get file size estimate for different formats
 */
export function estimateFileSize(
  width: number,
  height: number,
  format: ExportFormat
): string {
  const pixels = width * height

  // Rough estimates in bytes
  let bytes: number

  switch (format) {
    case 'png':
      bytes = pixels * 4 // Uncompressed RGBA
      break
    case 'jpg':
      bytes = pixels * 0.3 // ~30% of uncompressed with good quality
      break
    case 'webp':
      bytes = pixels * 0.2 // ~20% of uncompressed, better than JPG
      break
  }

  // Convert to human-readable
  if (bytes < 1024) return `${bytes.toFixed(0)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
