'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DownloadButton } from '@/components/ui/download-button'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

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
        <p className="text-gray-400">Create seamless, tileable patterns and textures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Pattern Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your pattern... e.g., 'golden art deco waves with emerald accents'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-2 bg-gray-950 border-gray-800"
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
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-800 bg-gray-950 hover:border-gray-700'
                      }`}
                    >
                      <div className="font-medium">{style.name}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
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
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-800 bg-gray-950 hover:border-gray-700'
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

          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold mb-2">Tips for Great Patterns</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Be specific about colors and style</li>
              <li>• Mention symmetry or repetition if desired</li>
              <li>• Consider scale: small details or large motifs</li>
              <li>• Patterns are automatically tileable</li>
            </ul>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-6 bg-gray-900 border-gray-800">
            <Label className="mb-4 block">Pattern Preview</Label>
            <div className="aspect-square bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden">
              {generating ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-400">Creating seamless pattern...</p>
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
                <div className="text-center text-gray-500">
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
                  size="default"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 text-center">
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
