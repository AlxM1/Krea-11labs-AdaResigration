'use client'

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Mic,
  MicOff,
  FileAudio,
  Play,
  Pause,
  Copy,
  Download,
  Loader2,
  Check,
  X,
  Clock,
  FileText,
  Languages,
  Users,
  Sparkles
} from 'lucide-react'

interface TranscriptionResult {
  id: string
  text: string
  language?: string
  duration?: number
  speakers?: { speaker: string; segments: { start: number; end: number; text: string }[] }[]
  timestamps?: { start: number; end: number; text: string }[]
  createdAt: Date
}

export default function SpeechToTextPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<TranscriptionResult | null>(null)

  const [language, setLanguage] = useState('auto')
  const [enableTimestamps, setEnableTimestamps] = useState(true)
  const [enableDiarization, setEnableDiarization] = useState(false)

  const [copied, setCopied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setAudioBlob(null)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.webm'] },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setFile(null)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const clearAudio = () => {
    setFile(null)
    setAudioBlob(null)
    setResult(null)
  }

  const handleTranscribe = async () => {
    if (!file && !audioBlob) return

    setIsTranscribing(true)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 3, 90))
    }, 200)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 5000))

      clearInterval(progressInterval)
      setProgress(100)

      // Sample result
      const transcriptionResult: TranscriptionResult = {
        id: Date.now().toString(),
        text: 'This is a sample transcription result. The actual transcription would appear here based on the audio content. 11labs uses state-of-the-art AI models to accurately transcribe speech to text in multiple languages.',
        language: 'English',
        duration: 45,
        timestamps: [
          { start: 0, end: 3.5, text: 'This is a sample transcription result.' },
          { start: 3.5, end: 8.2, text: 'The actual transcription would appear here based on the audio content.' },
          { start: 8.2, end: 15, text: '11labs uses state-of-the-art AI models to accurately transcribe speech to text in multiple languages.' }
        ],
        createdAt: new Date()
      }

      if (enableDiarization) {
        transcriptionResult.speakers = [
          {
            speaker: 'Speaker 1',
            segments: [{ start: 0, end: 8.2, text: 'This is a sample transcription result. The actual transcription would appear here based on the audio content.' }]
          },
          {
            speaker: 'Speaker 2',
            segments: [{ start: 8.2, end: 15, text: '11labs uses state-of-the-art AI models to accurately transcribe speech to text in multiple languages.' }]
          }
        ]
      }

      setResult(transcriptionResult)
    } catch (error) {
      console.error('Transcription failed:', error)
    } finally {
      setIsTranscribing(false)
      setProgress(0)
    }
  }

  const copyToClipboard = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTranscript = () => {
    if (!result) return
    const blob = new Blob([result.text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Speech to Text</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Transcribe audio files with AI-powered speech recognition
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Record */}
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
              <div className="p-4 border-b border-[#2f2f2f]">
                <h3 className="font-semibold">Audio Source</h3>
              </div>

              {!file && !audioBlob ? (
                <>
                  {/* Drag & Drop */}
                  <div
                    {...getRootProps()}
                    className={`m-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      isDragActive
                        ? 'border-[#7c3aed] bg-[#7c3aed]/5'
                        : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-10 h-10 mx-auto mb-4 text-[#a1a1a1]" />
                    <p className="text-white mb-1">
                      {isDragActive ? 'Drop file here' : 'Drag & drop audio file'}
                    </p>
                    <p className="text-sm text-[#a1a1a1]">
                      or click to browse • MP3, WAV, FLAC (max 100MB)
                    </p>
                  </div>

                  {/* Record Button */}
                  <div className="p-4 border-t border-[#2f2f2f]">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl transition ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          <span>Stop Recording ({formatTime(recordingTime)})</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          <span>Record from Microphone</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* File Preview */
                <div className="p-4">
                  <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-[#7c3aed]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {file?.name || `Recording (${formatTime(recordingTime)})`}
                      </p>
                      <p className="text-sm text-[#666]">
                        {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'WebM audio'}
                      </p>
                    </div>
                    <button
                      onClick={clearAudio}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                    >
                      <X className="w-5 h-5 text-[#a1a1a1]" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4">Transcription Options</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
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

                <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#a1a1a1]" />
                    <div>
                      <p className="font-medium">Timestamps</p>
                      <p className="text-sm text-[#666]">Include word-level timestamps</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableTimestamps}
                    onChange={(e) => setEnableTimestamps(e.target.checked)}
                    className="w-5 h-5 rounded border-[#2f2f2f] text-[#7c3aed]"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#a1a1a1]" />
                    <div>
                      <p className="font-medium">Speaker Diarization</p>
                      <p className="text-sm text-[#666]">Identify different speakers</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableDiarization}
                    onChange={(e) => setEnableDiarization(e.target.checked)}
                    className="w-5 h-5 rounded border-[#2f2f2f] text-[#7c3aed]"
                  />
                </label>
              </div>
            </div>

            {/* Progress */}
            {isTranscribing && (
              <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7c3aed]" />
                  <span>Transcribing audio...</span>
                </div>
                <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7c3aed] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Transcribe Button */}
            <button
              onClick={handleTranscribe}
              disabled={(!file && !audioBlob) || isTranscribing}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Transcribe Audio
                </>
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div>
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] h-full">
              <div className="p-4 border-b border-[#2f2f2f] flex items-center justify-between">
                <h3 className="font-semibold">Transcription</h3>
                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#a1a1a1]" />
                      )}
                    </button>
                    <button
                      onClick={downloadTranscript}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                    >
                      <Download className="w-4 h-4 text-[#a1a1a1]" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {result ? (
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-[#666]">
                      {result.language && (
                        <span className="flex items-center gap-1">
                          <Languages className="w-4 h-4" />
                          {result.language}
                        </span>
                      )}
                      {result.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(result.duration)}
                        </span>
                      )}
                    </div>

                    {/* Transcription Text */}
                    {enableDiarization && result.speakers ? (
                      <div className="space-y-4">
                        {result.speakers.map((speaker, i) => (
                          <div key={i} className="p-4 bg-[#0a0a0a] rounded-xl">
                            <p className="text-sm font-medium text-[#7c3aed] mb-2">{speaker.speaker}</p>
                            {speaker.segments.map((seg, j) => (
                              <p key={j} className="text-[#a1a1a1]">
                                <span className="text-xs text-[#666] mr-2">
                                  [{formatTime(Math.floor(seg.start))}]
                                </span>
                                {seg.text}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : enableTimestamps && result.timestamps ? (
                      <div className="space-y-2">
                        {result.timestamps.map((seg, i) => (
                          <p key={i} className="text-[#a1a1a1]">
                            <span className="text-xs text-[#666] mr-2 font-mono">
                              [{formatTime(Math.floor(seg.start))}]
                            </span>
                            {seg.text}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#a1a1a1] whitespace-pre-wrap">{result.text}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-[#2f2f2f] flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-[#a1a1a1]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No transcription yet</h3>
                    <p className="text-[#a1a1a1]">
                      Upload or record audio to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
