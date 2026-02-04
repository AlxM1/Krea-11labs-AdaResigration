'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Grid,
  List,
  Play,
  Pause,
  Star,
  Plus,
  Download,
  MoreVertical,
  Globe,
  Mic,
  Users,
  Heart,
  ChevronDown,
  Database,
  Sparkles,
  Volume2,
  CheckCircle,
  Loader2,
  X,
  Info,
  ExternalLink
} from 'lucide-react'

interface LibraryVoice {
  id: string
  source: string
  source_id: string
  name: string
  description?: string
  gender?: string
  accent?: string
  language: string
  languages?: string[]
  quality: string
  style?: string
  license?: string
  is_downloaded: boolean
  sample_audio_path?: string
}

interface VoiceSource {
  id: string
  name: string
  description: string
  license: string
  speakers: number
  languages: string[]
}

interface FeaturedCategory {
  name: string
  description: string
  voice_ids: string[]
}

const sourceColors: Record<string, string> = {
  xtts_builtin: 'from-violet-600 to-purple-600',
  bark: 'from-orange-500 to-red-500',
  vctk: 'from-blue-500 to-cyan-500',
  hifi_tts: 'from-green-500 to-emerald-500',
  lj_speech: 'from-pink-500 to-rose-500',
  libri_tts: 'from-amber-500 to-yellow-500',
  common_voice: 'from-teal-500 to-cyan-500',
  speecht5: 'from-indigo-500 to-blue-500',
}

const sourceIcons: Record<string, string> = {
  xtts_builtin: '🎙️',
  bark: '🐕',
  vctk: '🎓',
  hifi_tts: '🎵',
  lj_speech: '📚',
  libri_tts: '📖',
  common_voice: '🌍',
  speecht5: '🤖',
}

const languageNames: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  tr: 'Turkish',
  ru: 'Russian',
  nl: 'Dutch',
  cs: 'Czech',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  hu: 'Hungarian',
  ko: 'Korean',
  hi: 'Hindi',
}

export default function VoiceLibraryPage() {
  const [voices, setVoices] = useState<LibraryVoice[]>([])
  const [sources, setSources] = useState<VoiceSource[]>([])
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null)
  const [activeGender, setActiveGender] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch voices from API
  useEffect(() => {
    fetchVoices()
    fetchSources()
    fetchStats()
    fetchFeatured()
  }, [activeSource, activeLanguage, activeGender, searchQuery])

  const fetchVoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeSource) params.append('source', activeSource)
      if (activeLanguage) params.append('language', activeLanguage)
      if (activeGender) params.append('gender', activeGender)
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', '100')

      const response = await fetch(`/api/v1/voice-library/voices?${params}`)
      const data = await response.json()
      setVoices(data.voices || [])
    } catch (error) {
      console.error('Failed to fetch voices:', error)
      // Use mock data for demo
      setVoices(getMockVoices())
    }
    setLoading(false)
  }

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/v1/voice-library/sources')
      const data = await response.json()
      setSources(data)
    } catch (error) {
      // Mock sources
      setSources([
        { id: 'xtts_builtin', name: 'XTTS v2 Built-in', description: 'Pre-trained speakers included with Coqui TTS', license: 'MPL-2.0', speakers: 59, languages: ['en', 'de', 'fr', 'es'] },
        { id: 'bark', name: 'Bark Presets', description: 'Suno AI Bark model voice presets', license: 'MIT', speakers: 40, languages: ['en', 'de', 'fr', 'es', 'ja', 'ko', 'zh'] },
        { id: 'vctk', name: 'VCTK Corpus', description: '110 English speakers with various accents', license: 'CC BY 4.0', speakers: 110, languages: ['en'] },
        { id: 'hifi_tts', name: 'Hi-Fi TTS', description: 'Studio quality recordings', license: 'CC BY 4.0', speakers: 10, languages: ['en'] },
        { id: 'lj_speech', name: 'LJSpeech', description: 'High-quality single female speaker', license: 'Public Domain', speakers: 1, languages: ['en'] },
      ])
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/voice-library/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      setStats({
        total_voices: 220,
        by_source: { xtts_builtin: 59, bark: 40, vctk: 110, hifi_tts: 10, lj_speech: 1 },
        by_gender: { male: 95, female: 125 },
        by_language: { en: 180, de: 10, fr: 10, es: 10, ja: 5, ko: 5 },
      })
    }
  }

  const fetchFeatured = async () => {
    try {
      const response = await fetch('/api/v1/voice-library/featured')
      const data = await response.json()
      setFeaturedCategories(data.categories || [])
    } catch (error) {
      setFeaturedCategories([
        { name: 'Ready to Use', description: 'Built-in voices that work immediately', voice_ids: [] },
        { name: 'British Accents', description: 'Authentic UK accent voices', voice_ids: [] },
        { name: 'Studio Quality', description: 'Professional recording quality', voice_ids: [] },
      ])
    }
  }

  const getMockVoices = (): LibraryVoice[] => {
    const mockVoices: LibraryVoice[] = []

    // XTTS Built-in voices
    const xttsVoices = [
      { name: 'Nova Hogarth', gender: 'female', accent: 'British', style: 'modern' },
      { name: 'Andrew Chipper', gender: 'male', accent: 'British', style: 'cheerful' },
      { name: 'Damien Black', gender: 'male', accent: 'British', style: 'dramatic' },
      { name: 'Gracie Wise', gender: 'female', accent: 'American', style: 'warm, friendly' },
      { name: 'Claribel Dervla', gender: 'female', accent: 'Irish', style: 'calm, narrative' },
      { name: 'Torcull Diarmuid', gender: 'male', accent: 'Scottish', style: 'warm' },
      { name: 'Sofia Hellen', gender: 'female', accent: 'Greek', style: 'melodic' },
      { name: 'Kazuhiko Atallah', gender: 'male', accent: 'Japanese', style: 'precise' },
    ]
    xttsVoices.forEach((v, i) => {
      mockVoices.push({
        id: `xtts_${v.name.toLowerCase().replace(' ', '_')}`,
        source: 'xtts_builtin',
        source_id: v.name,
        name: v.name,
        description: `${v.style} voice with ${v.accent} accent`,
        gender: v.gender,
        accent: v.accent,
        language: 'en',
        quality: 'high',
        license: 'MPL-2.0',
        is_downloaded: true,
      })
    })

    // Bark voices
    const barkVoices = [
      { id: 'v2/en_speaker_6', name: 'English Female 1', gender: 'female', language: 'en' },
      { id: 'v2/en_speaker_0', name: 'English Male 1', gender: 'male', language: 'en' },
      { id: 'v2/de_speaker_2', name: 'German Female', gender: 'female', language: 'de' },
      { id: 'v2/ja_speaker_1', name: 'Japanese Female', gender: 'female', language: 'ja' },
      { id: 'v2/ko_speaker_1', name: 'Korean Female', gender: 'female', language: 'ko' },
      { id: 'v2/zh_speaker_1', name: 'Chinese Female', gender: 'female', language: 'zh' },
    ]
    barkVoices.forEach((v) => {
      mockVoices.push({
        id: `bark_${v.id.replace('/', '_')}`,
        source: 'bark',
        source_id: v.id,
        name: v.name,
        description: `Bark AI voice preset - ${v.name}`,
        gender: v.gender,
        language: v.language,
        quality: 'high',
        license: 'MIT',
        is_downloaded: true,
      })
    })

    // VCTK voices
    const vctkAccents = ['English', 'Scottish', 'Irish', 'American', 'Indian', 'Welsh']
    for (let i = 225; i <= 240; i++) {
      const gender = i % 2 === 0 ? 'female' : 'male'
      const accent = vctkAccents[i % vctkAccents.length]
      mockVoices.push({
        id: `vctk_p${i}`,
        source: 'vctk',
        source_id: `p${i}`,
        name: `VCTK p${i}`,
        description: `${gender.charAt(0).toUpperCase() + gender.slice(1)} speaker with ${accent} accent`,
        gender,
        accent,
        language: 'en',
        quality: 'high',
        license: 'CC BY 4.0',
        is_downloaded: false,
      })
    }

    // HiFi-TTS voices
    const hifiVoices = [
      { id: '92', gender: 'female' },
      { id: '6097', gender: 'female' },
      { id: '6670', gender: 'male' },
      { id: '9017', gender: 'male' },
    ]
    hifiVoices.forEach((v) => {
      mockVoices.push({
        id: `hifi_${v.id}`,
        source: 'hifi_tts',
        source_id: v.id,
        name: `HiFi Speaker ${v.id}`,
        description: `Studio quality ${v.gender} voice`,
        gender: v.gender,
        language: 'en',
        quality: 'studio',
        license: 'CC BY 4.0',
        is_downloaded: false,
      })
    })

    // LJSpeech
    mockVoices.push({
      id: 'ljspeech_linda',
      source: 'lj_speech',
      source_id: 'lj',
      name: 'LJ (Linda Johnson)',
      description: 'High-quality female voice from audiobook recordings. Clear, professional narration style.',
      gender: 'female',
      accent: 'American',
      language: 'en',
      quality: 'studio',
      license: 'Public Domain',
      is_downloaded: false,
    })

    return mockVoices
  }

  const handlePlay = async (voice: LibraryVoice) => {
    if (playingId === voice.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    setPreviewLoading(voice.id)

    try {
      // For demo, use a placeholder audio
      const audioUrl = `/api/v1/voice-library/voices/${voice.id}/preview?text=Hello, this is a preview of my voice.`

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        setPlayingId(voice.id)
      }
    } catch (error) {
      console.error('Failed to play preview:', error)
    }

    setPreviewLoading(null)
  }

  const handleDownload = async (voice: LibraryVoice) => {
    setDownloadingId(voice.id)
    try {
      const response = await fetch(`/api/v1/voice-library/voices/${voice.id}/download`, {
        method: 'POST',
      })
      if (response.ok) {
        // Update voice status
        setVoices(prev => prev.map(v =>
          v.id === voice.id ? { ...v, is_downloaded: true } : v
        ))
      }
    } catch (error) {
      console.error('Failed to download voice:', error)
    }
    setDownloadingId(null)
  }

  const handleAddToCollection = async (voice: LibraryVoice) => {
    try {
      await fetch(`/api/v1/voice-library/voices/${voice.id}/add-to-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voice.id }),
      })
      // Show success notification
    } catch (error) {
      console.error('Failed to add to collection:', error)
    }
  }

  const clearFilters = () => {
    setActiveSource(null)
    setActiveLanguage(null)
    setActiveGender(null)
    setSearchQuery('')
  }

  const hasActiveFilters = activeSource || activeLanguage || activeGender || searchQuery

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        onError={() => setPlayingId(null)}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Database className="w-7 h-7 sm:w-8 sm:h-8 text-[#7c3aed]" />
                Voice Library
              </h1>
              <p className="text-[#a1a1a1] text-sm mt-1">
                {stats?.total_voices || 220}+ free voices from open source datasets
              </p>
            </div>
            <Link
              href="/app/voice-cloning"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Clone Your Voice</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-violet-400">
              {stats?.total_voices || 220}+
            </div>
            <div className="text-xs sm:text-sm text-[#a1a1a1]">Total Voices</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">
              {Object.keys(stats?.by_language || {}).length || 17}
            </div>
            <div className="text-xs sm:text-sm text-[#a1a1a1]">Languages</div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">8</div>
            <div className="text-xs sm:text-sm text-[#a1a1a1]">Data Sources</div>
          </div>
          <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">100%</div>
            <div className="text-xs sm:text-sm text-[#a1a1a1]">Free to Use</div>
          </div>
        </div>

        {/* Source Tabs */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-2">
            <button
              onClick={() => setActiveSource(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition whitespace-nowrap ${
                !activeSource
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-[#1f1f1f] text-[#a1a1a1] hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              All Sources
            </button>
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => setActiveSource(activeSource === source.id ? null : source.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition whitespace-nowrap ${
                  activeSource === source.id
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-[#1f1f1f] text-[#a1a1a1] hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <span>{sourceIcons[source.id] || '🎤'}</span>
                <span>{source.name}</span>
                <span className="text-xs opacity-70">({source.speakers})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, accent, or description..."
              className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#a1a1a1] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition flex-1 sm:flex-none justify-center ${
                showFilters || hasActiveFilters
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-[#1f1f1f] text-[#a1a1a1] hover:text-white'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  {[activeSource, activeLanguage, activeGender].filter(Boolean).length}
                </span>
              )}
            </button>

            <div className="flex bg-[#1f1f1f] rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filter Voices</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#7c3aed] hover:text-[#9d6aff] flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium text-[#a1a1a1] mb-2">
                  Language
                </label>
                <select
                  value={activeLanguage || ''}
                  onChange={(e) => setActiveLanguage(e.target.value || null)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg text-white focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="">All Languages</option>
                  {Object.entries(languageNames).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-[#a1a1a1] mb-2">
                  Gender
                </label>
                <select
                  value={activeGender || ''}
                  onChange={(e) => setActiveGender(e.target.value || null)}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg text-white focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Quality Filter */}
              <div>
                <label className="block text-sm font-medium text-[#a1a1a1] mb-2">
                  Quality
                </label>
                <select className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg text-white focus:outline-none focus:border-[#7c3aed]">
                  <option value="">All Quality Levels</option>
                  <option value="studio">Studio Quality</option>
                  <option value="high">High Quality</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4 text-sm text-[#a1a1a1]">
          <span>
            Showing {voices.length} voices
            {hasActiveFilters && ' (filtered)'}
          </span>
          {activeSource && (
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>
                License: {sources.find(s => s.id === activeSource)?.license || 'Open Source'}
              </span>
            </div>
          )}
        </div>

        {/* Voice Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
          }>
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl overflow-hidden hover:border-[#3f3f3f] transition group ${
                  viewMode === 'list' ? 'flex items-center' : ''
                }`}
              >
                <div className={`p-4 ${viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}`}>
                  {/* Avatar with Play Button */}
                  <div className={`relative ${viewMode === 'list' ? '' : 'mb-4'}`}>
                    <div className={`bg-gradient-to-br ${sourceColors[voice.source] || 'from-gray-600 to-gray-700'} rounded-xl flex items-center justify-center ${
                      viewMode === 'list' ? 'w-14 h-14' : 'w-full aspect-square'
                    }`}>
                      <span className={`text-white font-bold ${viewMode === 'list' ? 'text-xl' : 'text-3xl sm:text-4xl'}`}>
                        {voice.name.charAt(0)}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePlay(voice)}
                      disabled={previewLoading === voice.id}
                      className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl`}
                    >
                      {previewLoading === voice.id ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      ) : playingId === voice.id ? (
                        <Pause className="w-8 h-8 text-white" />
                      ) : (
                        <Play className="w-8 h-8 text-white" />
                      )}
                    </button>

                    {/* Source Badge */}
                    {viewMode === 'grid' && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                        {sourceIcons[voice.source] || '🎤'} {voice.source.replace('_', ' ').replace('builtin', '')}
                      </div>
                    )}

                    {/* Downloaded Badge */}
                    {voice.is_downloaded && (
                      <div className="absolute bottom-2 right-2 bg-green-500/80 text-white p-1 rounded-full">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white truncate">{voice.name}</h3>
                      {viewMode === 'list' && (
                        <span className="text-xs bg-[#2f2f2f] px-2 py-1 rounded-full whitespace-nowrap">
                          {sourceIcons[voice.source]} {voice.source.replace('_builtin', '')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#a1a1a1] mt-1">
                      {languageNames[voice.language] || voice.language}
                      {voice.gender && ` • ${voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1)}`}
                      {voice.accent && ` • ${voice.accent}`}
                    </p>
                    {voice.description && viewMode === 'grid' && (
                      <p className="text-xs text-[#666] mt-2 line-clamp-2">
                        {voice.description}
                      </p>
                    )}

                    {/* Quality & License */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        voice.quality === 'studio' ? 'bg-green-500/20 text-green-400' :
                        voice.quality === 'high' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {voice.quality}
                      </span>
                      {voice.license && (
                        <span className="text-xs text-[#666]">{voice.license}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-2 ${viewMode === 'list' ? '' : 'mt-4'}`}>
                    {!voice.is_downloaded && voice.source !== 'xtts_builtin' && voice.source !== 'bark' && (
                      <button
                        onClick={() => handleDownload(voice)}
                        disabled={downloadingId === voice.id}
                        className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1] hover:text-white"
                        title="Download voice data"
                      >
                        {downloadingId === voice.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleAddToCollection(voice)}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1] hover:text-white"
                      title="Add to my collection"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/app/speech-synthesis?voice=${voice.id}&source=${voice.source}`}
                      className="flex-1 py-2 px-3 sm:px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg text-center transition"
                    >
                      Use Voice
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && voices.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-[#a1a1a1]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No voices found</h3>
            <p className="text-[#a1a1a1] mb-4">
              Try adjusting your filters or search query
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
            >
              <X className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#7c3aed]" />
              About Voice Sources
            </h3>
            <div className="space-y-3 text-sm text-[#a1a1a1]">
              <p>
                <strong className="text-white">XTTS v2 Built-in:</strong> Pre-trained multilingual speakers from Coqui TTS. Ready to use immediately.
              </p>
              <p>
                <strong className="text-white">Bark:</strong> Suno AI's text-to-speech model with expressive voice presets in multiple languages.
              </p>
              <p>
                <strong className="text-white">VCTK:</strong> 110 English speakers with diverse British and American accents. Requires download.
              </p>
              <p>
                <strong className="text-white">Hi-Fi TTS:</strong> Studio quality recordings, perfect for professional narration.
              </p>
              <p>
                <strong className="text-white">LJSpeech:</strong> Public domain female voice, widely used for TTS training.
              </p>
            </div>
          </div>

          <div className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#7c3aed]" />
              Licensing Information
            </h3>
            <div className="space-y-3 text-sm text-[#a1a1a1]">
              <p>
                All voices in this library are from open source datasets with permissive licenses for personal use.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-white">CC BY 4.0:</strong> Free to use with attribution</li>
                <li><strong className="text-white">CC0 / Public Domain:</strong> No restrictions</li>
                <li><strong className="text-white">MIT:</strong> Free for any purpose</li>
                <li><strong className="text-white">MPL-2.0:</strong> Open source, modifications must be shared</li>
              </ul>
              <p className="text-xs mt-4">
                For commercial use, please verify the specific license requirements for each dataset.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
