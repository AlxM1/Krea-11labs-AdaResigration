'use client'

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Mic,
  MicOff,
  X,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  Zap
} from 'lucide-react'

type CloneType = 'instant' | 'professional'

interface UploadedFile {
  id: string
  file: File
  name: string
  duration?: number
  status: 'pending' | 'uploading' | 'ready' | 'error'
}

export default function VoiceCloningPage() {
  const [cloneType, setCloneType] = useState<CloneType>('instant')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [description, setDescription] = useState('')
  const [labels, setLabels] = useState({ gender: '', age: '', accent: '', useCase: '' })

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: boolean; message: string; voiceId?: string } | null>(null)

  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      status: 'ready' as const
    }))
    setFiles(prev => [...prev, ...newFiles].slice(0, cloneType === 'instant' ? 25 : 50))
    setResult(null)
  }, [cloneType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a'] },
    maxSize: 50 * 1024 * 1024,
  })

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

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

  const handleCreate = async () => {
    if (!voiceName.trim() || (files.length === 0 && !audioBlob) || !agreedToTerms) return

    setIsCreating(true)
    setProgress(0)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('name', voiceName)
      formData.append('description', description)
      formData.append('clone_type', cloneType)
      Object.entries(labels).forEach(([key, value]) => {
        if (value) formData.append(`labels[${key}]`, value)
      })

      files.forEach(f => formData.append('files', f.file))
      if (audioBlob) {
        formData.append('files', audioBlob, 'recording.webm')
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 200)

      const response = await fetch('/api/v1/voices/add', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) throw new Error('Failed to create voice')

      const data = await response.json()
      setResult({
        success: true,
        message: 'Voice created successfully!',
        voiceId: data.voice_id
      })

      // Reset form
      setFiles([])
      setAudioBlob(null)
      setVoiceName('')
      setDescription('')
      setLabels({ gender: '', age: '', accent: '', useCase: '' })

    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to create voice. Please try again.'
      })
    } finally {
      setIsCreating(false)
      setProgress(0)
    }
  }

  const totalDuration = files.reduce((acc, f) => acc + (f.duration || 0), 0) + recordingTime

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Voice Cloning</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Create a digital copy of a voice from audio samples
          </p>
        </div>

        {/* Clone Type Selector */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setCloneType('instant')}
            className={`p-6 rounded-xl border-2 transition text-left ${
              cloneType === 'instant'
                ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-6 h-6 text-[#7c3aed]" />
              <h3 className="font-semibold text-lg">Instant Voice Cloning</h3>
            </div>
            <p className="text-[#a1a1a1] text-sm mb-3">
              Create a voice clone instantly from a few samples. Best for quick results.
            </p>
            <ul className="text-sm text-[#a1a1a1] space-y-1">
              <li>• 1-2 minutes of audio</li>
              <li>• Instant results</li>
              <li>• Good quality</li>
            </ul>
          </button>

          <button
            onClick={() => setCloneType('professional')}
            className={`p-6 rounded-xl border-2 transition text-left ${
              cloneType === 'professional'
                ? 'border-[#7c3aed] bg-[#7c3aed]/10'
                : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-6 h-6 text-[#db2777]" />
              <h3 className="font-semibold text-lg">Professional Voice Cloning</h3>
              <span className="px-2 py-0.5 text-xs bg-[#7c3aed] rounded-full">PRO</span>
            </div>
            <p className="text-[#a1a1a1] text-sm mb-3">
              High-fidelity voice clone trained on your voice data.
            </p>
            <ul className="text-sm text-[#a1a1a1] space-y-1">
              <li>• 30 min - 3 hours of audio</li>
              <li>• Takes a few hours</li>
              <li>• Best quality</li>
            </ul>
          </button>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            result.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div>
              <p className={result.success ? 'text-green-500' : 'text-red-500'}>
                {result.message}
              </p>
              {result.voiceId && (
                <a
                  href={`/app/speech-synthesis?voice=${result.voiceId}`}
                  className="text-sm text-[#7c3aed] hover:underline"
                >
                  Use your new voice →
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - Audio Upload */}
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] overflow-hidden">
              <div className="p-4 border-b border-[#2f2f2f]">
                <h3 className="font-semibold">Audio Samples</h3>
                <p className="text-sm text-[#a1a1a1] mt-1">
                  Upload or record audio of the voice you want to clone
                </p>
              </div>

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
                  {isDragActive ? 'Drop files here' : 'Drag & drop audio files'}
                </p>
                <p className="text-sm text-[#a1a1a1]">
                  or click to browse • MP3, WAV, FLAC
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

              {/* File List */}
              {(files.length > 0 || audioBlob) && (
                <div className="p-4 border-t border-[#2f2f2f] space-y-2 max-h-48 overflow-y-auto">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded-lg">
                      <div className="w-8 h-8 bg-[#7c3aed]/20 rounded-lg flex items-center justify-center">
                        <Mic className="w-4 h-4 text-[#7c3aed]" />
                      </div>
                      <span className="flex-1 text-sm truncate">{f.name}</span>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="p-1 hover:bg-[#2f2f2f] rounded"
                      >
                        <X className="w-4 h-4 text-[#a1a1a1]" />
                      </button>
                    </div>
                  ))}
                  {audioBlob && (
                    <div className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded-lg">
                      <div className="w-8 h-8 bg-[#db2777]/20 rounded-lg flex items-center justify-center">
                        <Mic className="w-4 h-4 text-[#db2777]" />
                      </div>
                      <span className="flex-1 text-sm">Recording ({formatTime(recordingTime)})</span>
                      <button
                        onClick={() => setAudioBlob(null)}
                        className="p-1 hover:bg-[#2f2f2f] rounded"
                      >
                        <X className="w-4 h-4 text-[#a1a1a1]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f]">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#7c3aed] mt-0.5" />
                <div>
                  <h4 className="font-medium mb-2">Tips for best results</h4>
                  <ul className="text-sm text-[#a1a1a1] space-y-1">
                    <li>• Use high-quality audio with minimal background noise</li>
                    <li>• Include varied speech (different emotions, pacing)</li>
                    <li>• Ensure consistent audio levels throughout</li>
                    <li>• Single speaker only in each recording</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Voice Details */}
          <div className="space-y-6">
            <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-6 space-y-4">
              <h3 className="font-semibold">Voice Details</h3>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Voice Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g., My Voice Clone"
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the voice characteristics..."
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg h-24 resize-none focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Gender</label>
                  <select
                    value={labels.gender}
                    onChange={(e) => setLabels(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Age</label>
                  <select
                    value={labels.age}
                    onChange={(e) => setLabels(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="">Select...</option>
                    <option value="young">Young</option>
                    <option value="middle_aged">Middle Aged</option>
                    <option value="old">Old</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-[#a1a1a1]">
                I confirm that I have the right to use this voice and that its use complies with the{' '}
                <a href="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</a>
              </span>
            </label>

            {/* Progress */}
            {isCreating && (
              <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f]">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7c3aed]" />
                  <span>Creating voice clone...</span>
                </div>
                <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7c3aed] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!voiceName.trim() || (files.length === 0 && !audioBlob) || !agreedToTerms || isCreating}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Voice...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Voice Clone
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
