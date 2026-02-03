'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import {
  Volume2,
  Upload,
  FileAudio,
  Download,
  Loader2,
  Copy,
  CheckCircle,
  Languages
} from 'lucide-react'

export default function SpeechToTextPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<{
    text: string
    language: string
    duration: number
    segments: Array<{ start: number; end: number; text: string; speaker?: string }>
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Settings
  const [language, setLanguage] = useState('auto')
  const [diarize, setDiarize] = useState(false)
  const [timestamps, setTimestamps] = useState('segment')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setTranscription(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.webm']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  })

  const handleTranscribe = async () => {
    if (!file) return

    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)
      formData.append('diarize', String(diarize))
      formData.append('timestamps', timestamps)

      const response = await fetch('/api/v1/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      setTranscription({
        text: data.text,
        language: data.language,
        duration: data.duration_seconds,
        segments: data.segments || []
      })
    } catch (error) {
      console.error('Error transcribing:', error)
      alert('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const copyToClipboard = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadTranscription = (format: 'txt' | 'srt' | 'vtt') => {
    if (!transcription) return

    let content = ''
    let filename = 'transcription'

    if (format === 'txt') {
      content = transcription.text
      filename += '.txt'
    } else if (format === 'srt') {
      transcription.segments.forEach((seg, i) => {
        content += `${i + 1}\n`
        content += `${formatTime(seg.start, 'srt')} --> ${formatTime(seg.end, 'srt')}\n`
        content += `${seg.text}\n\n`
      })
      filename += '.srt'
    } else if (format === 'vtt') {
      content = 'WEBVTT\n\n'
      transcription.segments.forEach((seg) => {
        content += `${formatTime(seg.start, 'vtt')} --> ${formatTime(seg.end, 'vtt')}\n`
        content += `${seg.text}\n\n`
      })
      filename += '.vtt'
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number, format: 'srt' | 'vtt') => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    const sep = format === 'srt' ? ',' : '.'
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${sep}${ms.toString().padStart(3, '0')}`
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Speech to Text</h1>
          <p className="text-muted-foreground mb-8">
            Transcribe audio with AI-powered accuracy in 99+ languages
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Upload & Transcription */}
            <div className="lg:col-span-2 space-y-4">
              {/* Upload Area */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                        <FileAudio className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p className="text-sm text-primary mt-1">Click to change file</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="mb-2">Drag & drop an audio file, or click to select</p>
                      <p className="text-sm text-muted-foreground">
                        MP3, WAV, FLAC, OGG, M4A, WebM • Max 100MB
                      </p>
                    </>
                  )}
                </div>

                {file && (
                  <button
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileAudio className="w-4 h-4" />
                        Transcribe Audio
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Transcription Result */}
              {transcription && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="font-semibold">Transcription</h3>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Languages className="w-4 h-4" />
                        {transcription.language}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.floor(transcription.duration / 60)}:{Math.floor(transcription.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-muted rounded-lg transition"
                        title="Copy"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                    {timestamps === 'segment' ? (
                      <div className="space-y-3">
                        {transcription.segments.map((seg, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                              {Math.floor(seg.start / 60)}:{Math.floor(seg.start % 60).toString().padStart(2, '0')}
                            </span>
                            <p>{seg.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{transcription.text}</p>
                    )}
                  </div>

                  {/* Export Options */}
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">Export:</span>
                    <button
                      onClick={() => downloadTranscription('txt')}
                      className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-lg transition"
                    >
                      TXT
                    </button>
                    <button
                      onClick={() => downloadTranscription('srt')}
                      className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-lg transition"
                    >
                      SRT
                    </button>
                    <button
                      onClick={() => downloadTranscription('vtt')}
                      className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-lg transition"
                    >
                      VTT
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg p-3"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Timestamps</label>
                    <select
                      value={timestamps}
                      onChange={(e) => setTimestamps(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg p-3"
                    >
                      <option value="segment">Sentence-level</option>
                      <option value="word">Word-level</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Speaker Detection</label>
                    <button
                      onClick={() => setDiarize(!diarize)}
                      className={`w-12 h-6 rounded-full transition ${
                        diarize ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition transform ${
                          diarize ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-2">Supported Languages</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI supports 99+ languages including English, Spanish, French, German,
                  Japanese, Korean, Chinese, Arabic, Hindi, and many more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
