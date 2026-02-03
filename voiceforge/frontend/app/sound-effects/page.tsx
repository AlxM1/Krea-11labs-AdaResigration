'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Volume2,
  Wand2,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles
} from 'lucide-react'

const suggestions = [
  { category: 'Nature', prompts: ['rain on a window', 'thunder in the distance', 'birds in a forest', 'ocean waves'] },
  { category: 'Urban', prompts: ['city traffic', 'footsteps on wood', 'door creaking', 'elevator ding'] },
  { category: 'Action', prompts: ['explosion', 'sword clash', 'glass breaking', 'car engine'] },
  { category: 'Ambient', prompts: ['coffee shop', 'office noise', 'spaceship hum', 'campfire'] },
  { category: 'Electronic', prompts: ['sci-fi beep', 'whoosh', 'notification', 'glitch'] },
]

export default function SoundEffectsPage() {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setAudioUrl(null)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('duration_seconds', duration.toString())
      formData.append('output_format', 'mp3')

      const response = await fetch('/api/v1/sound-generation/stream', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Generation failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      // Auto-play
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Error generating sound effect:', error)
      alert('Failed to generate sound effect. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `sfx-${prompt.slice(0, 20).replace(/\s+/g, '-')}.mp3`
    a.click()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">11labs</span>
          </Link>

          <Link
            href="/login"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Sound Effects Generator</h1>
          <p className="text-muted-foreground mb-8">
            Create any sound effect from a text description
          </p>

          {/* Generator */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the sound effect you want to create..."
                  className="w-full bg-muted border border-border rounded-lg p-4 outline-none focus:border-primary transition resize-none h-24"
                  maxLength={1000}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Be specific! "rain falling gently on a window at night" works better than "rain"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">Duration:</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground w-12">{duration}s</span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>

                <div className="flex-1">
                  <p className="font-medium mb-1">{prompt}</p>
                  <p className="text-sm text-muted-foreground">{duration} seconds</p>
                </div>

                <button
                  onClick={handleDownload}
                  className="p-3 hover:bg-muted rounded-lg transition"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>

              <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Suggestions */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Inspiration
            </h2>

            {suggestions.map((category) => (
              <div key={category.category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {category.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.prompts.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
