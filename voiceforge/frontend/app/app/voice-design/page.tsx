'use client'

import { useState } from 'react'
import {
  Sparkles,
  Play,
  Pause,
  Save,
  RefreshCw,
  Volume2,
  Sliders,
  Wand2,
  Heart,
  Download,
  ChevronDown,
  Loader2
} from 'lucide-react'

interface VoiceParameters {
  gender: 'male' | 'female' | 'neutral'
  age: 'young' | 'middle' | 'old'
  accent: string
  pitch: number
  speed: number
  emotion: string
}

interface GeneratedVoice {
  id: string
  name: string
  parameters: VoiceParameters
  previewUrl?: string
  createdAt: Date
  isSaved?: boolean
}

const accents = [
  'American', 'British', 'Australian', 'Indian', 'Irish', 'Scottish',
  'Spanish', 'French', 'German', 'Italian', 'Russian', 'Japanese'
]

const emotions = [
  'Neutral', 'Happy', 'Sad', 'Excited', 'Calm', 'Professional',
  'Friendly', 'Authoritative', 'Warm', 'Energetic'
]

const sampleText = "Hello! I'm your new AI voice. I can speak naturally and express different emotions. How do I sound?"

export default function VoiceDesignPage() {
  const [parameters, setParameters] = useState<VoiceParameters>({
    gender: 'female',
    age: 'middle',
    accent: 'American',
    pitch: 50,
    speed: 50,
    emotion: 'Neutral'
  })

  const [previewText, setPreviewText] = useState(sampleText)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedVoices, setGeneratedVoices] = useState<GeneratedVoice[]>([])
  const [currentPreview, setCurrentPreview] = useState<GeneratedVoice | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))

    const newVoice: GeneratedVoice = {
      id: Date.now().toString(),
      name: `${parameters.gender === 'male' ? 'Male' : parameters.gender === 'female' ? 'Female' : 'Neutral'} ${parameters.accent} Voice`,
      parameters: { ...parameters },
      previewUrl: '/audio/sample.mp3',
      createdAt: new Date()
    }

    setCurrentPreview(newVoice)
    setIsGenerating(false)
  }

  const handleRandomize = () => {
    setParameters({
      gender: ['male', 'female', 'neutral'][Math.floor(Math.random() * 3)] as any,
      age: ['young', 'middle', 'old'][Math.floor(Math.random() * 3)] as any,
      accent: accents[Math.floor(Math.random() * accents.length)],
      pitch: Math.floor(Math.random() * 100),
      speed: Math.floor(Math.random() * 100),
      emotion: emotions[Math.floor(Math.random() * emotions.length)]
    })
  }

  const handleSaveVoice = () => {
    if (currentPreview) {
      setGeneratedVoices(prev => [{ ...currentPreview, isSaved: true }, ...prev])
      setCurrentPreview(null)
    }
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Voice Design</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Create unique synthetic voices by describing characteristics
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel - Voice Parameters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice Characteristics */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-[#7c3aed]" />
                  Voice Characteristics
                </h2>
                <button
                  onClick={handleRandomize}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg text-sm transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Randomize
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium mb-3">Gender</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'neutral', label: 'Neutral' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setParameters(p => ({ ...p, gender: option.value as any }))}
                        className={`flex-1 py-2 rounded-lg transition ${
                          parameters.gender === option.value
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium mb-3">Age</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'young', label: 'Young' },
                      { value: 'middle', label: 'Middle' },
                      { value: 'old', label: 'Senior' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setParameters(p => ({ ...p, age: option.value as any }))}
                        className={`flex-1 py-2 rounded-lg transition ${
                          parameters.age === option.value
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent */}
                <div>
                  <label className="block text-sm font-medium mb-3">Accent</label>
                  <select
                    value={parameters.accent}
                    onChange={(e) => setParameters(p => ({ ...p, accent: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                  >
                    {accents.map(accent => (
                      <option key={accent} value={accent}>{accent}</option>
                    ))}
                  </select>
                </div>

                {/* Emotion */}
                <div>
                  <label className="block text-sm font-medium mb-3">Emotion/Tone</label>
                  <select
                    value={parameters.emotion}
                    onChange={(e) => setParameters(p => ({ ...p, emotion: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                  >
                    {emotions.map(emotion => (
                      <option key={emotion} value={emotion}>{emotion}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                {/* Pitch */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Pitch</label>
                    <span className="text-sm text-[#a1a1a1]">{parameters.pitch}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={parameters.pitch}
                    onChange={(e) => setParameters(p => ({ ...p, pitch: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#2f2f2f] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#7c3aed] [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <div className="flex justify-between text-xs text-[#666] mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Speed</label>
                    <span className="text-sm text-[#a1a1a1]">{parameters.speed}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={parameters.speed}
                    onChange={(e) => setParameters(p => ({ ...p, speed: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#2f2f2f] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#7c3aed] [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <div className="flex justify-between text-xs text-[#666] mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Text */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h2 className="font-semibold mb-4">Preview Text</h2>
              <textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Enter text to preview the voice..."
                rows={3}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl resize-none focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#db2777] hover:from-[#6d28d9] hover:to-[#be185d] disabled:opacity-50 rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Voice...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Voice
                </>
              )}
            </button>

            {/* Current Preview */}
            {currentPreview && (
              <div className="bg-[#1f1f1f] rounded-2xl border border-[#7c3aed] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Generated Voice Preview</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4 text-[#a1a1a1]" />
                    </button>
                    <button
                      onClick={handleSaveVoice}
                      className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
                    >
                      <Save className="w-4 h-4" />
                      Save Voice
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition ${
                      isPlaying
                        ? 'bg-[#7c3aed]'
                        : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>

                  <div className="flex-1">
                    <p className="font-medium mb-1">{currentPreview.name}</p>
                    <p className="text-sm text-[#666]">
                      {currentPreview.parameters.accent} • {currentPreview.parameters.emotion}
                    </p>
                  </div>
                </div>

                {/* Waveform placeholder */}
                <div className="mt-4 h-16 bg-[#0a0a0a] rounded-lg flex items-center justify-center gap-1 px-4">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        isPlaying ? 'bg-[#7c3aed] animate-pulse' : 'bg-[#2f2f2f]'
                      }`}
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 30}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Saved Voices */}
          <div className="space-y-6">
            {/* Current Parameters Summary */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#7c3aed]" />
                Current Settings
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Gender</span>
                  <span className="capitalize">{parameters.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Age</span>
                  <span className="capitalize">{parameters.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Accent</span>
                  <span>{parameters.accent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Emotion</span>
                  <span>{parameters.emotion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Pitch</span>
                  <span>{parameters.pitch}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1a1]">Speed</span>
                  <span>{parameters.speed}%</span>
                </div>
              </div>
            </div>

            {/* Saved Voices */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4">Saved Voices</h3>
              {generatedVoices.length > 0 ? (
                <div className="space-y-3">
                  {generatedVoices.map(voice => (
                    <div
                      key={voice.id}
                      className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-xl"
                    >
                      <button className="w-10 h-10 rounded-lg bg-[#2f2f2f] hover:bg-[#3f3f3f] flex items-center justify-center transition">
                        <Play className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{voice.name}</p>
                        <p className="text-xs text-[#666]">
                          {voice.parameters.accent}
                        </p>
                      </div>
                      <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition">
                        <Download className="w-4 h-4 text-[#666]" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#666] text-center py-4">
                  No saved voices yet. Generate and save a voice to see it here.
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4">Tips</h3>
              <ul className="space-y-2 text-sm text-[#a1a1a1]">
                <li>• Try different accent + age combinations</li>
                <li>• Adjust pitch for more variation</li>
                <li>• Use "Randomize" for inspiration</li>
                <li>• Save voices you like to your library</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
