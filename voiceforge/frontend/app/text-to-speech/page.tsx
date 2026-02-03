'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Volume2,
  Play,
  Pause,
  Download,
  RefreshCw,
  Settings,
  ChevronDown,
  Loader2
} from 'lucide-react'

// Voice options
const voices = [
  { id: 'rachel', name: 'Rachel', description: 'Calm and professional', language: 'English' },
  { id: 'drew', name: 'Drew', description: 'Warm and friendly', language: 'English' },
  { id: 'clyde', name: 'Clyde', description: 'Deep and authoritative', language: 'English' },
  { id: 'paul', name: 'Paul', description: 'Natural narrator', language: 'English' },
  { id: 'domi', name: 'Domi', description: 'Strong and expressive', language: 'English' },
  { id: 'dave', name: 'Dave', description: 'Conversational British', language: 'English' },
  { id: 'fin', name: 'Fin', description: 'Elderly Irish', language: 'English' },
  { id: 'sarah', name: 'Sarah', description: 'Soft and gentle', language: 'English' },
]

export default function TextToSpeechPage() {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(voices[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Voice settings
  const [stability, setStability] = useState(0.5)
  const [similarity, setSimilarity] = useState(0.75)
  const [speed, setSpeed] = useState(1.0)

  const handleGenerate = async () => {
    if (!text.trim()) return

    setIsGenerating(true)
    setAudioUrl(null)

    try {
      const response = await fetch('/api/v1/text-to-speech/' + selectedVoice.id + '/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: selectedVoice.id,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarity,
            speed
          },
          output_format: 'mp3'
        }),
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
      console.error('Error generating speech:', error)
      alert('Failed to generate speech. Please try again.')
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
    a.download = 'voiceforge-speech.mp3'
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
            <span className="font-bold text-xl">VoiceForge</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              10,000 characters remaining
            </span>
            <Link
              href="/login"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Text to Speech</h1>
          <p className="text-muted-foreground mb-8">
            Convert your text to natural-sounding speech with AI voices
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Text Input */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to convert to speech..."
                  className="w-full h-64 bg-transparent resize-none outline-none text-lg"
                  maxLength={40000}
                />
                <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                  <span className="text-sm text-muted-foreground">
                    {text.length.toLocaleString()} / 40,000 characters
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={!text.trim() || isGenerating}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        Generate Speech
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayback}
                      className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="h-12 bg-muted rounded-lg flex items-center px-4">
                        {/* Waveform placeholder */}
                        <div className="w-full h-8 flex items-center gap-0.5">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-primary/30 rounded-full"
                              style={{ height: `${Math.random() * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      className="p-3 hover:bg-muted rounded-lg transition"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>

                    <button
                      onClick={handleGenerate}
                      className="p-3 hover:bg-muted rounded-lg transition"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  <audio
                    ref={audioRef}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Settings Panel */}
            <div className="space-y-4">
              {/* Voice Selection */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Voice</h3>
                <div className="space-y-2">
                  {voices.slice(0, 4).map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`w-full p-3 rounded-lg text-left transition ${
                        selectedVoice.id === voice.id
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {voice.description}
                      </div>
                    </button>
                  ))}
                </div>
                <button className="w-full mt-4 text-sm text-primary hover:underline">
                  Browse all voices
                </button>
              </div>

              {/* Voice Settings */}
              <div className="bg-card border border-border rounded-xl p-4">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="font-semibold">Voice Settings</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition ${showSettings ? 'rotate-180' : ''}`} />
                </button>

                {showSettings && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Stability</span>
                        <span>{stability.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={stability}
                        onChange={(e) => setStability(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Variable</span>
                        <span>Stable</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Similarity</span>
                        <span>{similarity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={similarity}
                        onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Speed</span>
                        <span>{speed.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.5x</span>
                        <span>2x</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Model</h3>
                <select className="w-full bg-muted border border-border rounded-lg p-3">
                  <option value="eleven_multilingual_v2">Multilingual v2 (Best Quality)</option>
                  <option value="eleven_flash_v2_5">Flash v2.5 (Low Latency)</option>
                  <option value="eleven_turbo_v2_5">Turbo v2.5 (Balanced)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
