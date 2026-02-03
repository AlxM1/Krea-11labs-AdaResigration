'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import {
  Volume2,
  Upload,
  Mic,
  X,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function VoiceCloningPage() {
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{ success: boolean; message: string; voiceId?: string } | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 5))
    setResult(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.m4a']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!files.length || !name.trim()) return

    setIsUploading(true)
    setUploadProgress(0)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      files.forEach((file) => formData.append('files', file))

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/v1/voices/add', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }

      const data = await response.json()
      setResult({
        success: true,
        message: 'Voice cloned successfully!',
        voiceId: data.voice_id
      })
      setFiles([])
      setName('')
      setDescription('')

    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clone voice'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Voice Cloning</h1>
          <p className="text-muted-foreground mb-8">
            Create a custom AI voice from your audio samples
          </p>

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
                  <p className="text-sm text-muted-foreground mt-1">
                    Voice ID: {result.voiceId}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Audio Samples
              </h3>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p>Drop the files here...</p>
                ) : (
                  <>
                    <p className="mb-2">Drag & drop audio files here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      MP3, WAV, FLAC, OGG, M4A • Max 100MB per file
                    </p>
                  </>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Mic className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 hover:bg-background rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Tips for best results:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use high-quality audio with minimal background noise</li>
                  <li>• Include 1-2 minutes of clear speech</li>
                  <li>• A single speaker throughout the recording</li>
                  <li>• Natural speaking pace (not too fast or slow)</li>
                </ul>
              </div>
            </div>

            {/* Voice Details */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Voice Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Voice Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Voice Clone"
                    className="w-full bg-muted border border-border rounded-lg p-3 outline-none focus:border-primary transition"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the voice characteristics..."
                    className="w-full bg-muted border border-border rounded-lg p-3 outline-none focus:border-primary transition h-24 resize-none"
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Cloning voice...</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {uploadProgress}% complete
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!files.length || !name.trim() || isUploading}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Voice Clone...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Create Voice Clone
                </>
              )}
            </button>

            {/* Info */}
            <p className="text-center text-sm text-muted-foreground">
              By creating a voice clone, you confirm that you have the rights to use this voice.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
