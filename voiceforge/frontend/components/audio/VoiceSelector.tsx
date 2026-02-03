'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  Search,
  Play,
  Pause,
  Star,
  Plus,
  Mic,
  Globe,
  User
} from 'lucide-react'

interface Voice {
  id: string
  name: string
  category: 'premade' | 'cloned' | 'community'
  language?: string
  gender?: string
  accent?: string
  previewUrl?: string
  isFavorite?: boolean
}

interface VoiceSelectorProps {
  voices: Voice[]
  selectedVoice: Voice | null
  onSelect: (voice: Voice) => void
  onAddVoice?: () => void
}

const categoryIcons = {
  premade: Globe,
  cloned: Mic,
  community: User,
}

const categoryLabels = {
  premade: 'Premade',
  cloned: 'Your Voices',
  community: 'Community',
}

export default function VoiceSelector({
  voices,
  selectedVoice,
  onSelect,
  onAddVoice
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const audioRef = useRef<HTMLAudioElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || voice.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    if (!acc[voice.category]) {
      acc[voice.category] = []
    }
    acc[voice.category].push(voice)
    return acc
  }, {} as Record<string, Voice[]>)

  const handlePlayPreview = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation()
    if (playingId === voice.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current && voice.previewUrl) {
        audioRef.current.src = voice.previewUrl
        audioRef.current.play()
        setPlayingId(voice.id)
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Voice Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2f2f2f] rounded-xl transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-lg flex items-center justify-center">
            {selectedVoice ? (
              <span className="text-white font-medium">
                {selectedVoice.name.charAt(0)}
              </span>
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="text-left">
            <p className="text-white font-medium">
              {selectedVoice?.name || 'Select a voice'}
            </p>
            {selectedVoice && (
              <p className="text-sm text-[#a1a1a1]">
                {selectedVoice.language || 'English'} • {selectedVoice.gender || 'Neutral'}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-[#a1a1a1] transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50 max-h-[400px] overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-[#2f2f2f]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1a1]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voices..."
                className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg text-white placeholder-[#a1a1a1] text-sm focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-2 border-b border-[#2f2f2f]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                activeCategory === 'all'
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f]'
              }`}
            >
              All
            </button>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  activeCategory === key
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Voice List */}
          <div className="max-h-[280px] overflow-y-auto">
            {Object.entries(groupedVoices).map(([category, categoryVoices]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-[#0a0a0a]">
                  <p className="text-xs font-medium text-[#a1a1a1] uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </p>
                </div>
                {categoryVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      onSelect(voice)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2f2f2f] transition ${
                      selectedVoice?.id === voice.id ? 'bg-[#2f2f2f]' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-[#2f2f2f] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium">
                        {voice.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{voice.name}</p>
                      <p className="text-xs text-[#a1a1a1]">
                        {voice.language || 'English'} • {voice.accent || 'Neutral'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {voice.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <button
                        onClick={(e) => handlePlayPreview(voice, e)}
                        className="p-2 hover:bg-[#3f3f3f] rounded-lg transition"
                      >
                        {playingId === voice.id ? (
                          <Pause className="w-4 h-4 text-[#7c3aed]" />
                        ) : (
                          <Play className="w-4 h-4 text-[#a1a1a1]" />
                        )}
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Add Voice Button */}
          {onAddVoice && (
            <div className="p-3 border-t border-[#2f2f2f]">
              <button
                onClick={onAddVoice}
                className="w-full flex items-center justify-center gap-2 py-2 text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add New Voice</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />
    </div>
  )
}
