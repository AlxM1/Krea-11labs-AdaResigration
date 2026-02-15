'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Select } from '@/components/ui/select'
import { DownloadButton } from '@/components/ui/download-button'
import { Loader2, Upload, Sparkles, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { useModels } from '@/hooks/use-models'

export default function ImageToImagePage() {
  const { models, bestModel } = useModels('image-to-image')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [strength, setStrength] = useState(0.75)
  const [selectedModel, setSelectedModel] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return
    setIsEnhancing(true)
    try {
      const res = await fetch('/api/llm/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (data.enhanced) {
        setPrompt(data.enhanced)
        toast.success('Prompt enhanced!')
      }
    } catch {
      toast.error('Failed to enhance prompt')
    } finally {
      setIsEnhancing(false)
    }
  }

  // Auto-select best model
  if (bestModel && !selectedModel) {
    setSelectedModel(bestModel.id)
  }

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
      if (!uploadResponse.ok || !uploadData.url) {
        const errorMsg = uploadData.error || 'Failed to upload image'
        toast.error(errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[img2img frontend] Image uploaded:', uploadData.url)

      // Generate image-to-image
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageUrl: uploadData.url,
          strength,
          model: selectedModel || 'sdxl',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.imageUrl) {
        const errorMsg = data.error || 'Generation failed'
        toast.error(errorMsg, { duration: 5000 })
        throw new Error(errorMsg)
      }

      setResult(data.imageUrl)
      toast.success('Image transformed!')
    } catch (error) {
      console.error('Image-to-image error:', error)
      // Error already shown via toast
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image-to-Image</h1>
        <p className="text-[#888]">Transform your images with AI guidance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="space-y-4">
              <div>
                <Label>Reference Image</Label>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">Transformation Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim() || isEnhancing}
                    className="h-7 text-xs"
                  >
                    {isEnhancing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Enhance
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="prompt"
                  placeholder="Describe how to transform the image... e.g., 'make it look like a watercolor painting' or 'add dramatic sunset lighting'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 bg-[#1a1a1a] border-[#2a2a2a]"
                />
              </div>

              <div>
                <Label>Model</Label>
                <Select
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={models.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
                <p className="text-xs text-[#555] mt-1">
                  {models.find((m) => m.id === selectedModel)?.description}
                </p>
              </div>

              <div>
                <Label>
                  Transformation Strength: {(strength * 100).toFixed(0)}%
                </Label>
                <div className="mt-2">
                  <Slider
                    value={strength}
                    onChange={setStrength}
                    min={0.1}
                    max={1}
                    step={0.05}
                  />
                  <div className="flex justify-between text-xs text-[#555] mt-1">
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

          <Card className="p-4 bg-[#1a1a1a] border-[#2a2a2a]">
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="text-sm text-[#888] space-y-1">
              <li>• Lower strength preserves more of the original</li>
              <li>• Higher strength allows more creative freedom</li>
              <li>• Be specific in your transformation prompt</li>
              <li>• Works great for style transfers and enhancements</li>
            </ul>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <Label className="mb-4 block">Result</Label>
            <div className="aspect-square bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#6c5ce7]" />
                  <p className="text-[#888]">Transforming image...</p>
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
                <div className="text-center text-[#555]">
                  <p>Upload an image and add a prompt to begin</p>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-4">
                <DownloadButton
                  imageUrl={result}
                  filename={`transformed-${Date.now()}`}
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
