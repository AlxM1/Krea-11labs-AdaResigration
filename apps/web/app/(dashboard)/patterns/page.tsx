'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DownloadButton } from '@/components/ui/download-button'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

const PATTERN_STYLES = [
  { id: 'geometric', name: 'Geometric', description: 'Clean lines and shapes' },
  { id: 'floral', name: 'Floral', description: 'Botanical patterns' },
  { id: 'abstract', name: 'Abstract', description: 'Artistic and freeform' },
  { id: 'nature', name: 'Nature', description: 'Natural elements' },
  { id: 'tech', name: 'Tech', description: 'Futuristic and digital' },
  { id: 'vintage', name: 'Vintage', description: 'Retro and classic' },
]

const TILE_SIZES = [
  { value: 512, label: '512x512' },
  { value: 1024, label: '1024x1024' },
  { value: 2048, label: '2048x2048' },
]

export default function PatternsPage() {
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('geometric')
  const [tileSize, setTileSize] = useState(1024)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
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

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/generate/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          tileSize,
        }),
      })

      const data = await response.json()

      if (data.imageUrl) {
        setResult(data.imageUrl)
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Pattern generation error:', error)
      alert('Failed to generate pattern. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Pattern Generator</h1>
        <p className="text-[#888]">Create seamless, tileable patterns and textures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">Pattern Description</Label>
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
                  placeholder="Describe your pattern... e.g., 'golden art deco waves with emerald accents'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 bg-[#1a1a1a] border-[#2a2a2a]"
                />
              </div>

              <div>
                <Label>Pattern Style</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {PATTERN_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-lg border text-left transition ${
                        selectedStyle === style.id
                          ? 'border-[#6c5ce7] bg-[#6c5ce7]/10'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      <div className="font-medium">{style.name}</div>
                      <div className="text-xs text-[#555]">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tile Size</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {TILE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setTileSize(size.value)}
                      className={`p-2 rounded-lg border text-center transition ${
                        tileSize === size.value
                          ? 'border-[#6c5ce7] bg-[#6c5ce7]/10'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Pattern...
                  </>
                ) : (
                  'Generate Seamless Pattern'
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-[#1a1a1a] border-[#2a2a2a]">
            <h3 className="font-semibold mb-2">Tips for Great Patterns</h3>
            <ul className="text-sm text-[#888] space-y-1">
              <li>• Be specific about colors and style</li>
              <li>• Mention symmetry or repetition if desired</li>
              <li>• Consider scale: small details or large motifs</li>
              <li>• Patterns are automatically tileable</li>
            </ul>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <Label className="mb-4 block">Pattern Preview</Label>
            <div className="aspect-square bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#6c5ce7]" />
                  <p className="text-[#888]">Creating seamless pattern...</p>
                </div>
              ) : result ? (
                <div className="relative w-full h-full">
                  <Image
                    src={result}
                    alt="Generated pattern"
                    fill
                    className="object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="text-center text-[#555]">
                  <p>Your pattern will appear here</p>
                  <p className="text-sm mt-2">Patterns are seamlessly tileable</p>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-4 space-y-2">
                <DownloadButton
                  imageUrl={result}
                  filename={`pattern-${Date.now()}`}
                  variant="outline"
                  size="md"
                  className="w-full"
                />
                <p className="text-xs text-[#555] text-center">
                  Pattern tiles seamlessly in all directions
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
