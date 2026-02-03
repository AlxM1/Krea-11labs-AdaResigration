'use client'

import { useState, useRef } from 'react'
import {
  Music,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
  Clock,
  Volume2,
  RefreshCw,
  Wand2,
  Save,
  Heart
} from 'lucide-react'

interface SoundEffect {
  id: string
  prompt: string
  duration: number
  audioUrl?: string
  createdAt: Date
  isSaved?: boolean
}

const examplePrompts = [
  'Thunderstorm with heavy rain and distant thunder',
  'Busy city street with cars and people talking',
  'Peaceful forest with birds chirping and wind',
  'Spaceship engine humming and electronic beeps',
  'Medieval tavern with crowd noise and music',
  'Ocean waves crashing on a beach',
  'Creepy horror ambiance with eerie sounds',
  'Coffee shop atmosphere with light chatter'
]

export default function SoundEffectsPage() {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSounds, setGeneratedSounds] = useState<SoundEffect[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90))
    }, 200)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 4000))

      clearInterval(progressInterval)
      setProgress(100)

      const newSound: SoundEffect = {
        id: Date.now().toString(),
        prompt,
        duration,
        audioUrl: '/audio/sample.mp3', // Would be real URL from API
        createdAt: new Date()
      }

      setGeneratedSounds(prev => [newSound, ...prev])
      setPrompt('')
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null)
    } else {
      setPlayingId(id)
    }
  }

  const toggleSave = (id: string) => {
    setGeneratedSounds(prev =>
      prev.map(s => s.id === id ? { ...s, isSaved: !s.isSaved } : s)
    )
  }

  const regenerate = (originalPrompt: string) => {
    setPrompt(originalPrompt)
    handleGenerate()
  }

  const useExample = (example: string) => {
    setPrompt(example)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Sound Effects</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Generate custom sound effects and ambient audio with AI
          </p>
        </div>

        {/* Generator Card */}
        <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">AI Sound Generator</h2>
              <p className="text-sm text-[#a1a1a1]">Describe the sound you want to create</p>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Sound Description</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the sound effect you want to generate..."
              rows={3}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] resize-none focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          {/* Duration Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Duration</label>
              <span className="text-sm text-[#a1a1a1]">{duration} seconds</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-[#2f2f2f] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#7c3aed] [&::-webkit-slider-thumb]:rounded-full"
            />
            <div className="flex justify-between text-xs text-[#666] mt-1">
              <span>1s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#7c3aed]" />
                <span className="text-sm">Generating sound effect...</span>
              </div>
              <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Sound Effect
              </>
            )}
          </button>
        </div>

        {/* Example Prompts */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Try these examples</h3>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, i) => (
              <button
                key={i}
                onClick={() => useExample(example)}
                className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2f2f2f] border border-[#2f2f2f] rounded-lg text-sm text-[#a1a1a1] hover:text-white transition"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Generated Sounds */}
        {generatedSounds.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4">Generated Sounds</h3>
            <div className="space-y-4">
              {generatedSounds.map((sound) => (
                <div
                  key={sound.id}
                  className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Play Button */}
                    <button
                      onClick={() => togglePlay(sound.id)}
                      className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        playingId === sound.id
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                          : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                      }`}
                    >
                      {playingId === sound.id ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1 line-clamp-2">{sound.prompt}</p>
                      <div className="flex items-center gap-4 text-sm text-[#666]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {sound.duration}s
                        </span>
                        <span>
                          {sound.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSave(sound.id)}
                        className={`p-2 rounded-lg transition ${
                          sound.isSaved
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'hover:bg-[#2f2f2f] text-[#a1a1a1]'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${sound.isSaved ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => regenerate(sound.prompt)}
                        className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1]"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1]">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Waveform Visualization (Placeholder) */}
                  <div className="mt-4 h-12 bg-[#0a0a0a] rounded-lg flex items-center justify-center gap-1 px-4">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          playingId === sound.id ? 'bg-cyan-500' : 'bg-[#2f2f2f]'
                        }`}
                        style={{
                          height: `${Math.random() * 100}%`,
                          animationDelay: `${i * 50}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {generatedSounds.length === 0 && (
          <div className="text-center py-12 bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f]">
            <div className="w-16 h-16 rounded-full bg-[#2f2f2f] flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-[#a1a1a1]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No sounds generated yet</h3>
            <p className="text-[#a1a1a1]">
              Describe a sound effect above to generate your first audio
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
