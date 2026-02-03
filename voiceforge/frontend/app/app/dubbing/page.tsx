'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Globe,
  Play,
  Pause,
  Download,
  Loader2,
  Video,
  Languages,
  Check,
  ChevronDown,
  Volume2,
  Users,
  Clock,
  Sparkles,
  FileVideo,
  Settings
} from 'lucide-react'

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' }
]

interface DubbingJob {
  id: string
  fileName: string
  sourceLanguage: string
  targetLanguages: string[]
  status: 'processing' | 'completed' | 'failed'
  progress: number
  duration?: number
  speakers?: number
  results?: { language: string; url: string }[]
  createdAt: Date
}

export default function DubbingPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['es', 'fr'])
  const [preserveVoice, setPreserveVoice] = useState(true)
  const [lipSync, setLipSync] = useState(true)

  const [isProcessing, setIsProcessing] = useState(false)
  const [currentJob, setCurrentJob] = useState<DubbingJob | null>(null)
  const [jobs, setJobs] = useState<DubbingJob[]>([])

  const [showSourceDropdown, setShowSourceDropdown] = useState(false)
  const [showTargetDropdown, setShowTargetDropdown] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.flac', '.m4a']
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false
  })

  const toggleTargetLanguage = (code: string) => {
    setTargetLanguages(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const handleStartDubbing = async () => {
    if (!file || targetLanguages.length === 0) return

    setIsProcessing(true)

    const job: DubbingJob = {
      id: Date.now().toString(),
      fileName: file.name,
      sourceLanguage,
      targetLanguages,
      status: 'processing',
      progress: 0,
      createdAt: new Date()
    }

    setCurrentJob(job)

    // Simulate processing
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setCurrentJob(prev => prev ? { ...prev, progress: i } : null)
    }

    // Complete job
    const completedJob: DubbingJob = {
      ...job,
      status: 'completed',
      progress: 100,
      duration: 180,
      speakers: 3,
      results: targetLanguages.map(lang => ({
        language: lang,
        url: `/dubbed/${lang}.mp4`
      }))
    }

    setCurrentJob(null)
    setJobs(prev => [completedJob, ...prev])
    setFile(null)
    setIsProcessing(false)
  }

  const getLanguageName = (code: string) =>
    languages.find(l => l.code === code)?.name || code

  const getLanguageFlag = (code: string) =>
    languages.find(l => l.code === code)?.flag || '🌐'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">AI Dubbing</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Automatically translate and dub videos into multiple languages
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Card */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
              <div className="p-4 border-b border-[#2f2f2f]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold">New Dubbing Project</h2>
                    <p className="text-sm text-[#666]">Upload video or audio to dub</p>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`m-6 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                    isDragActive
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[#a1a1a1]" />
                  <p className="text-white text-lg mb-2">
                    {isDragActive ? 'Drop your file here' : 'Upload video or audio'}
                  </p>
                  <p className="text-sm text-[#a1a1a1]">
                    MP4, MOV, AVI, MP3, WAV • Max 500MB
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* File Info */}
                  <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-[#666]">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-sm text-[#a1a1a1] hover:text-white"
                    >
                      Change
                    </button>
                  </div>

                  {/* Source Language */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Source Language</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl"
                      >
                        <span className="flex items-center gap-2">
                          <span>{getLanguageFlag(sourceLanguage)}</span>
                          <span>{getLanguageName(sourceLanguage)}</span>
                        </span>
                        <ChevronDown className="w-5 h-5 text-[#666]" />
                      </button>
                      {showSourceDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                          {languages.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setSourceLanguage(lang.code)
                                setShowSourceDropdown(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Languages */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Languages ({targetLanguages.length} selected)
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl"
                      >
                        <span className="flex items-center gap-2 flex-wrap">
                          {targetLanguages.length > 0 ? (
                            targetLanguages.slice(0, 5).map(code => (
                              <span key={code} className="px-2 py-1 bg-[#2f2f2f] rounded text-sm">
                                {getLanguageFlag(code)} {getLanguageName(code)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#666]">Select languages...</span>
                          )}
                          {targetLanguages.length > 5 && (
                            <span className="text-[#666] text-sm">+{targetLanguages.length - 5} more</span>
                          )}
                        </span>
                        <ChevronDown className="w-5 h-5 text-[#666] flex-shrink-0" />
                      </button>
                      {showTargetDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                          {languages
                            .filter(l => l.code !== sourceLanguage)
                            .map(lang => (
                              <button
                                key={lang.code}
                                onClick={() => toggleTargetLanguage(lang.code)}
                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#2f2f2f] transition"
                              >
                                <span className="flex items-center gap-3">
                                  <span>{lang.flag}</span>
                                  <span>{lang.name}</span>
                                </span>
                                {targetLanguages.includes(lang.code) && (
                                  <Check className="w-4 h-4 text-orange-500" />
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-[#a1a1a1]" />
                        <div>
                          <p className="font-medium">Voice Preservation</p>
                          <p className="text-sm text-[#666]">Keep original voice characteristics</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preserveVoice}
                        onChange={(e) => setPreserveVoice(e.target.checked)}
                        className="w-5 h-5 rounded border-[#2f2f2f] text-orange-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Video className="w-5 h-5 text-[#a1a1a1]" />
                        <div>
                          <p className="font-medium">Lip Sync</p>
                          <p className="text-sm text-[#666]">Match audio timing to lip movements</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={lipSync}
                        onChange={(e) => setLipSync(e.target.checked)}
                        className="w-5 h-5 rounded border-[#2f2f2f] text-orange-500"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Processing Progress */}
              {currentJob && (
                <div className="p-6 border-t border-[#2f2f2f]">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <span>Processing dubbing job...</span>
                    <span className="text-sm text-[#666]">{currentJob.progress}%</span>
                  </div>
                  <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                      style={{ width: `${currentJob.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#666] mt-2">
                    Translating to {currentJob.targetLanguages.length} languages...
                  </p>
                </div>
              )}

              {/* Start Button */}
              {file && !currentJob && (
                <div className="p-6 border-t border-[#2f2f2f]">
                  <button
                    onClick={handleStartDubbing}
                    disabled={targetLanguages.length === 0 || isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start Dubbing
                  </button>
                </div>
              )}
            </div>

            {/* Completed Jobs */}
            {jobs.length > 0 && (
              <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
                <div className="p-4 border-b border-[#2f2f2f]">
                  <h3 className="font-semibold">Completed Projects</h3>
                </div>
                <div className="divide-y divide-[#2f2f2f]">
                  {jobs.map(job => (
                    <div key={job.id} className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{job.fileName}</p>
                          <div className="flex items-center gap-4 text-sm text-[#666]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor((job.duration || 0) / 60)}:{((job.duration || 0) % 60).toString().padStart(2, '0')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {job.speakers} speakers
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.results?.map(result => (
                          <button
                            key={result.language}
                            className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] hover:bg-[#2f2f2f] rounded-lg transition"
                          >
                            <span>{getLanguageFlag(result.language)}</span>
                            <span className="text-sm">{getLanguageName(result.language)}</span>
                            <Download className="w-4 h-4 text-[#666]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4">Usage This Month</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#a1a1a1]">Minutes Dubbed</span>
                    <span>45 / 120</span>
                  </div>
                  <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[37.5%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#a1a1a1]">Projects</span>
                    <span>3 / 10</span>
                  </div>
                  <div className="h-2 bg-[#2f2f2f] rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[30%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Supported Languages */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5 text-orange-500" />
                {languages.length} Languages
              </h3>
              <div className="flex flex-wrap gap-2">
                {languages.slice(0, 8).map(lang => (
                  <span
                    key={lang.code}
                    className="px-2 py-1 bg-[#0a0a0a] rounded text-sm"
                  >
                    {lang.flag} {lang.name}
                  </span>
                ))}
                <span className="px-2 py-1 text-sm text-[#666]">
                  +{languages.length - 8} more
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6">
              <h3 className="font-semibold mb-4">Features</h3>
              <ul className="space-y-3 text-sm">
                {[
                  'Voice cloning for natural dubbing',
                  'Automatic speaker detection',
                  'Lip sync optimization',
                  'Background audio preservation',
                  'Multiple language output',
                  'Subtitle generation'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#a1a1a1]">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
