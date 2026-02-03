'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Settings,
  Download,
  Bookmark,
  List,
  Clock,
  ChevronDown,
  Loader2,
  BookOpen,
  Newspaper,
  Globe,
  X
} from 'lucide-react'

interface ReadingItem {
  id: string
  title: string
  content: string
  source: 'upload' | 'url' | 'paste'
  voiceId: string
  voiceName: string
  progress: number
  duration?: number
  createdAt: Date
}

interface Voice {
  id: string
  name: string
  category: string
}

const voices: Voice[] = [
  { id: 'rachel', name: 'Rachel', category: 'Female' },
  { id: 'adam', name: 'Adam', category: 'Male' },
  { id: 'emily', name: 'Emily', category: 'Female' },
  { id: 'james', name: 'James', category: 'Male' }
]

const sampleLibrary: ReadingItem[] = [
  {
    id: '1',
    title: 'The Future of AI in Healthcare',
    content: 'Artificial intelligence is transforming healthcare...',
    source: 'url',
    voiceId: 'rachel',
    voiceName: 'Rachel',
    progress: 45,
    duration: 1200,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    id: '2',
    title: 'Chapter 1 - The Beginning',
    content: 'It was a dark and stormy night...',
    source: 'upload',
    voiceId: 'adam',
    voiceName: 'Adam',
    progress: 100,
    duration: 1800,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
  }
]

export default function ReaderPage() {
  const [inputMode, setInputMode] = useState<'upload' | 'url' | 'paste'>('paste')
  const [url, setUrl] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(voices[0])
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [currentItem, setCurrentItem] = useState<ReadingItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)

  const [library, setLibrary] = useState(sampleLibrary)
  const [showLibrary, setShowLibrary] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      // Would parse PDF/EPUB/TXT content
      handleStartReading(file.name, 'Sample content from uploaded file...', 'upload')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false
  })

  const handleStartReading = async (title: string, content: string, source: 'upload' | 'url' | 'paste') => {
    setIsLoading(true)

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    const newItem: ReadingItem = {
      id: Date.now().toString(),
      title: title || 'Untitled',
      content,
      source,
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      progress: 0,
      duration: Math.ceil(content.split(/\s+/).length / 150 * 60),
      createdAt: new Date()
    }

    setCurrentItem(newItem)
    setLibrary(prev => [newItem, ...prev])
    setIsLoading(false)
    setIsPlaying(true)
  }

  const handleUrlSubmit = async () => {
    if (!url.trim()) return
    // Would fetch article content
    handleStartReading('Article from URL', 'Content fetched from the provided URL...', 'url')
  }

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return
    const title = pastedText.substring(0, 50) + (pastedText.length > 50 ? '...' : '')
    handleStartReading(title, pastedText, 'paste')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const skipForward = () => {
    if (currentItem?.duration) {
      setCurrentTime(prev => Math.min(prev + 30, currentItem.duration!))
    }
  }

  const skipBack = () => {
    setCurrentTime(prev => Math.max(prev - 10, 0))
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Reader</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Listen to articles, documents, and text with AI voices
            </p>
          </div>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition"
          >
            <List className="w-4 h-4" />
            Library ({library.length})
          </button>
        </div>

        {/* Main Content */}
        {!currentItem ? (
          <>
            {/* Input Mode Tabs */}
            <div className="flex bg-[#1f1f1f] rounded-xl p-1 mb-6">
              {[
                { value: 'paste', label: 'Paste Text', icon: FileText },
                { value: 'url', label: 'From URL', icon: Globe },
                { value: 'upload', label: 'Upload File', icon: Upload }
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setInputMode(mode.value as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition ${
                    inputMode === mode.value
                      ? 'bg-[#7c3aed] text-white'
                      : 'text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  <mode.icon className="w-4 h-4" />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden mb-6">
              {inputMode === 'paste' && (
                <div className="p-6">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your text here... Articles, stories, documents, anything you want to listen to."
                    rows={10}
                    className="w-full bg-transparent text-white placeholder-[#666] resize-none focus:outline-none"
                  />
                </div>
              )}

              {inputMode === 'url' && (
                <div className="p-6">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-[#666] mt-3">
                    Paste a URL to an article, blog post, or webpage
                  </p>
                </div>
              )}

              {inputMode === 'upload' && (
                <div
                  {...getRootProps()}
                  className={`m-6 border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                    isDragActive
                      ? 'border-[#7c3aed] bg-[#7c3aed]/5'
                      : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[#a1a1a1]" />
                  <p className="text-white text-lg mb-2">
                    {isDragActive ? 'Drop your file here' : 'Upload document'}
                  </p>
                  <p className="text-sm text-[#a1a1a1]">
                    PDF, EPUB, TXT • Max 50MB
                  </p>
                </div>
              )}
            </div>

            {/* Voice Selection */}
            <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#a1a1a1]" />
                  <span>Reading Voice</span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    className="flex items-center gap-3 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#db2777] flex items-center justify-center">
                      <span className="text-xs font-bold">{selectedVoice.name.charAt(0)}</span>
                    </div>
                    <span>{selectedVoice.name}</span>
                    <ChevronDown className="w-4 h-4 text-[#666]" />
                  </button>
                  {showVoiceDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowVoiceDropdown(false)} />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-50 py-2">
                        {voices.map(voice => (
                          <button
                            key={voice.id}
                            onClick={() => {
                              setSelectedVoice(voice)
                              setShowVoiceDropdown(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#db2777] flex items-center justify-center">
                              <span className="text-xs font-bold">{voice.name.charAt(0)}</span>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{voice.name}</p>
                              <p className="text-xs text-[#666]">{voice.category}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => {
                if (inputMode === 'url') handleUrlSubmit()
                else if (inputMode === 'paste') handlePasteSubmit()
              }}
              disabled={isLoading || (inputMode === 'paste' && !pastedText.trim()) || (inputMode === 'url' && !url.trim())}
              className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg transition flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Start Reading
                </>
              )}
            </button>
          </>
        ) : (
          /* Player View */
          <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#2f2f2f]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-2">{currentItem.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-[#666]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(currentItem.duration || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-4 h-4" />
                      {currentItem.voiceName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentItem(null)
                    setIsPlaying(false)
                    setCurrentTime(0)
                  }}
                  className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-[#a1a1a1]" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-6 max-h-64 overflow-y-auto">
              <p className="text-[#a1a1a1] leading-relaxed whitespace-pre-wrap">
                {currentItem.content}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="px-6">
              <div className="h-1 bg-[#2f2f2f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7c3aed] transition-all"
                  style={{ width: `${(currentTime / (currentItem.duration || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#666] mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentItem.duration || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={skipBack}
                  className="p-3 hover:bg-[#2f2f2f] rounded-full transition"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full flex items-center justify-center transition"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </button>
                <button
                  onClick={skipForward}
                  className="p-3 hover:bg-[#2f2f2f] rounded-full transition"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-sm text-[#666]">Speed:</span>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-1 text-sm rounded transition ${
                      playbackSpeed === speed
                        ? 'bg-[#7c3aed] text-white'
                        : 'text-[#666] hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition">
                  <Bookmark className="w-4 h-4" />
                  Bookmark
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition">
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Library Sidebar */}
        {showLibrary && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowLibrary(false)} />
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#1a1a1a] border-l border-[#2f2f2f] z-50 overflow-y-auto">
              <div className="p-6 border-b border-[#2f2f2f] flex items-center justify-between">
                <h3 className="font-semibold text-lg">Library</h3>
                <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-[#2f2f2f] rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {library.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentItem(item)
                      setShowLibrary(false)
                    }}
                    className="w-full p-4 bg-[#0a0a0a] hover:bg-[#2f2f2f] rounded-xl text-left transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2f2f2f] flex items-center justify-center flex-shrink-0">
                        {item.source === 'url' ? (
                          <Newspaper className="w-5 h-5 text-[#a1a1a1]" />
                        ) : item.source === 'upload' ? (
                          <FileText className="w-5 h-5 text-[#a1a1a1]" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-[#a1a1a1]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-[#666] mt-1">
                          {item.voiceName} • {formatTime(item.duration || 0)}
                        </p>
                        {item.progress > 0 && item.progress < 100 && (
                          <div className="h-1 bg-[#2f2f2f] rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-[#7c3aed]"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
