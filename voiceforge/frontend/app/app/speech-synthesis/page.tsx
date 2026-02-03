'use client'

import { useState, useRef } from 'react'
import {
  Play,
  Download,
  History,
  ChevronDown,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import VoiceSelector from '@/components/audio/VoiceSelector'
import VoiceSettings from '@/components/audio/VoiceSettings'
import AudioPlayer from '@/components/audio/AudioPlayer'

// Sample voices data
const sampleVoices = [
  { id: '1', name: 'Rachel', category: 'premade' as const, language: 'English', gender: 'Female', accent: 'American', previewUrl: '' },
  { id: '2', name: 'Adam', category: 'premade' as const, language: 'English', gender: 'Male', accent: 'American', previewUrl: '' },
  { id: '3', name: 'Emily', category: 'premade' as const, language: 'English', gender: 'Female', accent: 'British', previewUrl: '' },
  { id: '4', name: 'Thomas', category: 'premade' as const, language: 'English', gender: 'Male', accent: 'British', previewUrl: '' },
  { id: '5', name: 'My Clone', category: 'cloned' as const, language: 'English', gender: 'Male', isFavorite: true, previewUrl: '' },
]

const models = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Best quality, 29 languages', badge: 'RECOMMENDED' },
  { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5', description: 'Low latency, 32 languages', badge: 'FAST' },
  { id: 'eleven_monolingual_v1', name: 'Eleven English v1', description: 'English only, legacy' },
]

export default function SpeechSynthesisPage() {
  // Text input state
  const [text, setText] = useState('')
  const maxChars = 5000

  // Voice and settings
  const [selectedVoice, setSelectedVoice] = useState(sampleVoices[0])
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  // Voice settings
  const [stability, setStability] = useState(50)
  const [similarity, setSimilarity] = useState(75)
  const [style, setStyle] = useState(0)
  const [speakerBoost, setSpeakerBoost] = useState(true)
  const [speed, setSpeed] = useState(100)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // History
  const [history, setHistory] = useState<Array<{
    id: string
    text: string
    voiceName: string
    audioUrl: string
    createdAt: Date
  }>>([])
  const [showHistory, setShowHistory] = useState(false)

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return

    setIsGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('text', text)
      formData.append('voice_id', selectedVoice.id)
      formData.append('model_id', selectedModel.id)
      formData.append('stability', (stability / 100).toString())
      formData.append('similarity_boost', (similarity / 100).toString())
      formData.append('style', (style / 100).toString())
      formData.append('use_speaker_boost', speakerBoost.toString())
      formData.append('speed', (speed / 100).toString())

      const response = await fetch('/api/v1/text-to-speech', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Generation failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setGeneratedAudio(url)

      // Add to history
      setHistory(prev => [{
        id: Date.now().toString(),
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        voiceName: selectedVoice.name,
        audioUrl: url,
        createdAt: new Date()
      }, ...prev].slice(0, 20))

    } catch (err) {
      setError('Failed to generate audio. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedAudio) return
    const a = document.createElement('a')
    a.href = generatedAudio
    a.download = `elevenlabs-${Date.now()}.mp3`
    a.click()
  }

  const resetSettings = () => {
    setStability(50)
    setSimilarity(75)
    setStyle(0)
    setSpeakerBoost(true)
    setSpeed(100)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Speech Synthesis</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Convert text to lifelike speech using AI
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              showHistory
                ? 'bg-[#7c3aed] text-white'
                : 'bg-[#1f1f1f] text-[#a1a1a1] hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] rounded-lg transition"
              >
                <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                <span className="text-sm">{selectedModel.name}</span>
                <ChevronDown className="w-4 h-4 text-[#a1a1a1]" />
              </button>

              {showModelDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model)
                        setShowModelDropdown(false)
                      }}
                      className={`w-full flex items-center justify-between p-4 hover:bg-[#2f2f2f] transition ${
                        selectedModel.id === model.id ? 'bg-[#2f2f2f]' : ''
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-white">{model.name}</p>
                        <p className="text-sm text-[#a1a1a1]">{model.description}</p>
                      </div>
                      {model.badge && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          model.badge === 'RECOMMENDED'
                            ? 'bg-[#7c3aed]/20 text-[#7c3aed]'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {model.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] overflow-hidden">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                placeholder="Type or paste your text here..."
                className="w-full h-64 p-4 bg-transparent text-white placeholder-[#666] resize-none focus:outline-none text-lg leading-relaxed"
              />
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#2f2f2f]">
                <span className="text-sm text-[#a1a1a1]">
                  {text.length.toLocaleString()} / {maxChars.toLocaleString()} characters
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setText('')}
                    className="text-sm text-[#a1a1a1] hover:text-white transition"
                    disabled={!text}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Speech
                </>
              )}
            </button>

            {/* Generated Audio */}
            {generatedAudio && (
              <AudioPlayer
                audioUrl={generatedAudio}
                title={text.slice(0, 50) + (text.length > 50 ? '...' : '')}
                onDownload={handleDownload}
                onRegenerate={handleGenerate}
              />
            )}
          </div>

          {/* Sidebar - Voice & Settings */}
          <div className="space-y-6">
            <VoiceSelector
              voices={sampleVoices}
              selectedVoice={selectedVoice}
              onSelect={setSelectedVoice}
              onAddVoice={() => window.location.href = '/app/voice-cloning'}
            />

            <VoiceSettings
              stability={stability}
              similarity={similarity}
              style={style}
              speakerBoost={speakerBoost}
              speed={speed}
              onStabilityChange={setStability}
              onSimilarityChange={setSimilarity}
              onStyleChange={setStyle}
              onSpeakerBoostChange={setSpeakerBoost}
              onSpeedChange={setSpeed}
              onReset={resetSettings}
            />

            {/* Output Format */}
            <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-4">
              <h3 className="font-medium text-white mb-3">Output Format</h3>
              <div className="flex gap-2">
                {['mp3_44100_128', 'mp3_44100_192', 'pcm_16000', 'pcm_22050'].map((format) => (
                  <button
                    key={format}
                    className="px-3 py-1.5 text-sm bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                  >
                    {format.split('_')[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">Recent Generations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-4"
                >
                  <p className="text-sm text-[#a1a1a1] mb-2 truncate">{item.text}</p>
                  <div className="flex items-center justify-between text-xs text-[#666]">
                    <span>{item.voiceName}</span>
                    <span>{item.createdAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-3">
                    <AudioPlayer
                      audioUrl={item.audioUrl}
                      showWaveform={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
