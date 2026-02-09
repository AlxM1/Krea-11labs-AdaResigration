'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'

export default function ImageToImagePage() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [strength, setStrength] = useState(0.75)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = () => {
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

  const handleGenerate = async () => {
    if (!imageUrl || !prompt.trim()) return

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

      // Generate image-to-image
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageUrl: uploadData.url,
          strength,
          mode: 'image-to-image',
        }),
      })

      const data = await response.json()

      if (data.imageUrl) {
        setResult(data.imageUrl)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Image-to-image error:', error)
      alert('Failed to generate image. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image-to-Image</h1>
        <p className="text-gray-400">Transform your images with AI guidance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="space-y-4">
              <div>
                <Label>Reference Image</Label>
                <div
                  {...getRootProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input {...getInputProps()} />
                  {imageUrl ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={imageUrl}
                        alt="Reference"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p className="text-gray-400">
                        {isDragActive
                          ? 'Drop image here...'
                          : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        PNG, JPG, JPEG, WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="prompt">Transformation Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe how to transform the image... e.g., 'make it look like a watercolor painting' or 'add dramatic sunset lighting'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 bg-gray-950 border-gray-800"
                />
              </div>

              <div>
                <Label>
                  Transformation Strength: {(strength * 100).toFixed(0)}%
                </Label>
                <div className="mt-2">
                  <Slider
                    value={[strength]}
                    onValueChange={(value) => setStrength(value[0])}
                    min={0.1}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Subtle (keep original)</span>
                    <span>Strong (more creative)</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!imageUrl || !prompt.trim() || generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  'Transform Image'
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Lower strength preserves more of the original</li>
              <li>• Higher strength allows more creative freedom</li>
              <li>• Be specific in your transformation prompt</li>
              <li>• Works great for style transfers and enhancements</li>
            </ul>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-6 bg-gray-900 border-gray-800">
            <Label className="mb-4 block">Result</Label>
            <div className="aspect-square bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-400">Transforming image...</p>
                </div>
              ) : result ? (
                <div className="relative w-full h-full">
                  <Image
                    src={result}
                    alt="Generated result"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>Upload an image and add a prompt to begin</p>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = result
                    link.download = `transformed-${Date.now()}.png`
                    link.click()
                  }}
                >
                  Download Result
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
