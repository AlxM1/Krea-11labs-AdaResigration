'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DownloadButton } from '@/components/ui/download-button'
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { useModels } from '@/hooks/use-models'

const UPSCALE_FACTORS = [
  { value: 2, label: '2x (Medium)' },
  { value: 4, label: '4x (High)' },
  { value: 8, label: '8x (Ultra)' },
]

export default function UpscalePage() {
  const { models: upscaleModels, bestModel } = useModels('upscale')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(4)
  const [model, setModel] = useState('')
  const [generating, setGenerating] = useState(false)

  // Auto-select best model
  if (bestModel && !model) {
    setModel(bestModel.id)
  }
  const [result, setResult] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        const img = new window.Image()
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
        }
        img.src = reader.result as string
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  })

  const handleUpscale = async () => {
    if (!imageUrl) return

    setGenerating(true)
    setResult(null)

    try {
      // Upload image first
      const formData = new FormData()
      if (uploadedFile) {
        formData.append('file', uploadedFile)
      }

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadResponse.json()
      if (!uploadData.url) {
        throw new Error('Failed to upload image')
      }

      // Upscale image
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          scale: scale.toString(),
          model,
          denoise: 50,
          faceEnhance: model === 'gfpgan' || model === 'codeformer',
        }),
      })

      const data = await response.json()

      if (data.imageUrl) {
        setResult(data.imageUrl)
      } else {
        throw new Error(data.error || 'Upscaling failed')
      }
    } catch (error) {
      console.error('Upscale error:', error)
      alert('Failed to upscale image. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const upscaledDimensions = {
    width: originalDimensions.width * scale,
    height: originalDimensions.height * scale,
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Upscaling</h1>
        <p className="text-[#888]">Enhance and enlarge your images with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="space-y-4">
              <div>
                <Label>Upload Image</Label>
                <div
                  {...getRootProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    isDragActive
                      ? 'border-[#6c5ce7] bg-[#6c5ce7]/10'
                      : 'border-[#2a2a2a] hover:border-[#333]'
                  }`}
                >
                  <input {...getInputProps()} />
                  {imageUrl ? (
                    <div>
                      <div className="relative w-full h-48 mb-2">
                        <Image
                          src={imageUrl}
                          alt="Original"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-xs text-[#555]">
                        {originalDimensions.width} × {originalDimensions.height} px
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-[#555] mb-4" />
                      <p className="text-[#888]">
                        {isDragActive
                          ? 'Drop image here...'
                          : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-[#555] mt-2">
                        PNG, JPG, JPEG, WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Upscale Factor</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {UPSCALE_FACTORS.map((factor) => (
                    <button
                      key={factor.value}
                      onClick={() => setScale(factor.value)}
                      className={`p-3 rounded-lg border text-center transition ${
                        scale === factor.value
                          ? 'border-[#6c5ce7] bg-[#6c5ce7]/10'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      {factor.label}
                    </button>
                  ))}
                </div>
                {originalDimensions.width > 0 && (
                  <p className="text-xs text-[#555] mt-2 text-center">
                    Output: {upscaledDimensions.width} × {upscaledDimensions.height} px
                  </p>
                )}
              </div>

              <div>
                <Label>Upscaling Model</Label>
                <div className="space-y-2 mt-2">
                  {upscaleModels.map((upscaleModel) => (
                    <button
                      key={upscaleModel.id}
                      onClick={() => setModel(upscaleModel.id)}
                      className={`w-full p-3 rounded-lg border text-left transition ${
                        model === upscaleModel.id
                          ? 'border-[#6c5ce7] bg-[#6c5ce7]/10'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      <div className="font-medium">{upscaleModel.name}</div>
                      <div className="text-xs text-[#555]">
                        {upscaleModel.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleUpscale}
                disabled={!imageUrl || generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upscaling...
                  </>
                ) : (
                  'Upscale Image'
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-[#1a1a1a] border-[#2a2a2a]">
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="text-sm text-[#888] space-y-1">
              {upscaleModels.map((m) => (
                <li key={m.id}>• {m.name}: {m.description}</li>
              ))}
              <li>• Higher scales take longer to process</li>
            </ul>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <Label className="mb-4 block">Upscaled Result</Label>
            <div className="aspect-square bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#6c5ce7]" />
                  <p className="text-[#888]">Upscaling image...</p>
                  <p className="text-xs text-[#555] mt-2">This may take a moment</p>
                </div>
              ) : result ? (
                <div className="relative w-full h-full">
                  <Image
                    src={result}
                    alt="Upscaled result"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="text-center text-[#555]">
                  <p>Upload an image to begin upscaling</p>
                  <p className="text-sm mt-2">Enhance resolution and quality</p>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-4">
                <DownloadButton
                  imageUrl={result}
                  filename={`upscaled-${scale}x-${Date.now()}`}
                  variant="outline"
                  size="md"
                  className="w-full"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
