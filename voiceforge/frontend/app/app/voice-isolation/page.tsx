'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Wand2,
  Download,
  Play,
  Pause,
  Loader2,
  Music,
  Mic,
  Volume2,
  Layers,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react'

type IsolationMode = 'vocals' | 'background' | 'both'

interface ProcessedAudio {
  id: string
  originalName: string
  vocalsUrl?: string
  backgroundUrl?: string
  createdAt: Date
}

export default function VoiceIsolationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<IsolationMode>('both')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ProcessedAudio | null>(null)
  const [playingTrack, setPlayingTrack] = useState<'original' | 'vocals' | 'background' | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a'] },
    maxSize: 100 * 1024 * 1024,
    multiple: false
  })

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 90))
    }, 300)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 8000))

      clearInterval(progressInterval)
      setProgress(100)

      setResult({
        id: Date.now().toString(),
        originalName: file.name,
        vocalsUrl: '/audio/vocals.mp3',
        backgroundUrl: '/audio/background.mp3',
        createdAt: new Date()
      })
    } catch (error) {
      console.error('Processing failed:', error)
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const togglePlay = (track: 'original' | 'vocals' | 'background') => {
    setPlayingTrack(playingTrack === track ? null : track)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Voice Isolation</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Separate vocals from background music using AI
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden mb-8">
          {/* Header */}
          <div className="p-6 border-b border-[#2f2f2f]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">AI Audio Separator</h2>
                <p className="text-sm text-[#a1a1a1]">
                  Extract vocals, instruments, or both from any audio
                </p>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`m-6 border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-[#a1a1a1]" />
              <p className="text-white text-lg mb-2">
                {isDragActive ? 'Drop your audio here' : 'Upload audio file'}
              </p>
              <p className="text-sm text-[#a1a1a1]">
                Drag & drop or click to browse • MP3, WAV, FLAC (max 100MB)
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* File Info */}
              <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Music className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-[#666]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => togglePlay('original')}
                  className={`p-3 rounded-xl transition ${
                    playingTrack === 'original'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                  }`}
                >
                  {playingTrack === 'original' ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                  }}
                  className="text-sm text-[#a1a1a1] hover:text-white"
                >
                  Change
                </button>
              </div>

              {/* Isolation Mode */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Extraction Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'vocals', label: 'Vocals Only', icon: Mic, desc: 'Extract voice track' },
                    { value: 'background', label: 'Music Only', icon: Music, desc: 'Extract instruments' },
                    { value: 'both', label: 'Both Tracks', icon: Layers, desc: 'Separate all' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMode(option.value as IsolationMode)}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        mode === option.value
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
                      }`}
                    >
                      <option.icon className={`w-5 h-5 mb-2 ${
                        mode === option.value ? 'text-emerald-500' : 'text-[#a1a1a1]'
                      }`} />
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-[#666] mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {isProcessing && (
                <div className="mb-6 p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                    <span>Processing audio with AI...</span>
                  </div>
                  <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#666] mt-2">
                    This may take a few moments depending on file length
                  </p>
                </div>
              )}

              {/* Process Button */}
              {!result && (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Separate Audio
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
            <div className="p-4 border-b border-[#2f2f2f] flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold">Separation Complete</span>
            </div>

            <div className="p-6 space-y-4">
              {/* Vocals Track */}
              {(mode === 'vocals' || mode === 'both') && result.vocalsUrl && (
                <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Vocals</p>
                    <p className="text-sm text-[#666]">Isolated voice track</p>
                  </div>
                  <button
                    onClick={() => togglePlay('vocals')}
                    className={`p-3 rounded-xl transition ${
                      playingTrack === 'vocals'
                        ? 'bg-pink-500 text-white'
                        : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                    }`}
                  >
                    {playingTrack === 'vocals' ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl transition">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}

              {/* Background Track */}
              {(mode === 'background' || mode === 'both') && result.backgroundUrl && (
                <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Music className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Instrumental</p>
                    <p className="text-sm text-[#666]">Background music track</p>
                  </div>
                  <button
                    onClick={() => togglePlay('background')}
                    className={`p-3 rounded-xl transition ${
                      playingTrack === 'background'
                        ? 'bg-blue-500 text-white'
                        : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                    }`}
                  >
                    {playingTrack === 'background' ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl transition">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}

              {/* Download All */}
              {mode === 'both' && (
                <button className="w-full py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl font-medium transition flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download All Tracks (ZIP)
                </button>
              )}

              {/* Process Another */}
              <button
                onClick={() => {
                  setFile(null)
                  setResult(null)
                }}
                className="w-full py-3 text-[#a1a1a1] hover:text-white transition"
              >
                Process another file
              </button>
            </div>
          </div>
        )}

        {/* Use Cases */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { title: 'Karaoke', desc: 'Remove vocals for sing-along tracks', icon: Music },
            { title: 'Remixing', desc: 'Extract vocals for your own productions', icon: Sparkles },
            { title: 'Transcription', desc: 'Isolate speech for clearer transcription', icon: Volume2 }
          ].map((useCase, i) => (
            <div key={i} className="p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f]">
              <useCase.icon className="w-6 h-6 text-emerald-500 mb-3" />
              <h3 className="font-medium mb-1">{useCase.title}</h3>
              <p className="text-sm text-[#666]">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
