'use client'

import { useState } from 'react'
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
  MoreVertical,
  Globe,
  Mic,
  Users,
  Heart,
  Share2,
  Trash2,
  Edit
} from 'lucide-react'

interface Voice {
  id: string
  name: string
  category: 'premade' | 'cloned' | 'community'
  description?: string
  language: string
  gender: string
  accent?: string
  age?: string
  useCase?: string
  previewUrl?: string
  isFavorite?: boolean
  usageCount?: number
  rating?: number
  createdAt?: Date
}

const sampleVoices: Voice[] = [
  { id: '1', name: 'Rachel', category: 'premade', language: 'English', gender: 'Female', accent: 'American', age: 'Young Adult', useCase: 'Narration', description: 'Calm and professional voice, perfect for audiobooks', rating: 4.8, usageCount: 150000 },
  { id: '2', name: 'Adam', category: 'premade', language: 'English', gender: 'Male', accent: 'American', age: 'Middle Aged', useCase: 'Narration', description: 'Deep and authoritative voice', rating: 4.7, usageCount: 120000 },
  { id: '3', name: 'Emily', category: 'premade', language: 'English', gender: 'Female', accent: 'British', age: 'Young Adult', useCase: 'Conversational', description: 'Friendly and warm British accent', rating: 4.9, usageCount: 95000 },
  { id: '4', name: 'Thomas', category: 'premade', language: 'English', gender: 'Male', accent: 'British', age: 'Middle Aged', useCase: 'News', description: 'Clear and articulate broadcaster voice', rating: 4.6, usageCount: 80000 },
  { id: '5', name: 'Sofia', category: 'premade', language: 'Spanish', gender: 'Female', accent: 'Castilian', age: 'Young Adult', useCase: 'Conversational', rating: 4.7, usageCount: 45000 },
  { id: '6', name: 'Marcus', category: 'premade', language: 'German', gender: 'Male', accent: 'Standard', age: 'Middle Aged', useCase: 'Narration', rating: 4.5, usageCount: 35000 },
  { id: '7', name: 'My Voice Clone', category: 'cloned', language: 'English', gender: 'Male', isFavorite: true, createdAt: new Date('2024-01-15') },
  { id: '8', name: 'Podcast Voice', category: 'cloned', language: 'English', gender: 'Female', createdAt: new Date('2024-02-20') },
]

const categories = [
  { id: 'all', label: 'All Voices', icon: Grid },
  { id: 'premade', label: 'Premade', icon: Globe },
  { id: 'cloned', label: 'Your Voices', icon: Mic },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'favorites', label: 'Favorites', icon: Heart },
]

const filters = {
  language: ['English', 'Spanish', 'German', 'French', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese'],
  gender: ['Male', 'Female', 'Neutral'],
  age: ['Young', 'Young Adult', 'Middle Aged', 'Old'],
  useCase: ['Narration', 'Conversational', 'News', 'Characters', 'ASMR'],
}

export default function VoiceLibraryPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})

  const filteredVoices = sampleVoices.filter(voice => {
    // Category filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'favorites') {
        if (!voice.isFavorite) return false
      } else if (voice.category !== activeCategory) {
        return false
      }
    }

    // Search filter
    if (searchQuery && !voice.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    return true
  })

  const toggleFavorite = (voiceId: string) => {
    // Toggle favorite logic
  }

  const handlePlay = (voiceId: string) => {
    if (playingId === voiceId) {
      setPlayingId(null)
    } else {
      setPlayingId(voiceId)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Voice Library</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Browse and manage your voices
            </p>
          </div>
          <Link
            href="/app/voice-cloning"
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Voice</span>
          </Link>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Categories */}
          <div className="w-56 flex-shrink-0">
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeCategory === category.id
                      ? 'bg-[#7c3aed] text-white'
                      : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <category.icon className="w-5 h-5" />
                  <span className="font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1a1]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#a1a1a1] focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition ${
                  showFilters
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-[#1f1f1f] text-[#a1a1a1] hover:text-white'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </button>

              <div className="flex bg-[#1f1f1f] rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-[#2f2f2f] text-white' : 'text-[#a1a1a1]'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-6 p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f]">
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(filters).map(([key, values]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#a1a1a1] mb-2 capitalize">
                        {key}
                      </label>
                      <select className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2f2f2f] rounded-lg text-white">
                        <option value="">All</option>
                        {values.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Grid */}
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
            }>
              {filteredVoices.map((voice) => (
                <div
                  key={voice.id}
                  className={`bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl overflow-hidden hover:border-[#3f3f3f] transition group ${
                    viewMode === 'list' ? 'flex items-center' : ''
                  }`}
                >
                  {/* Voice Card */}
                  <div className={`p-4 ${viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}`}>
                    {/* Avatar and Play */}
                    <div className={`relative ${viewMode === 'list' ? '' : 'mb-4'}`}>
                      <div className={`bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-xl flex items-center justify-center ${
                        viewMode === 'list' ? 'w-14 h-14' : 'w-full aspect-square'
                      }`}>
                        <span className={`text-white font-bold ${viewMode === 'list' ? 'text-xl' : 'text-4xl'}`}>
                          {voice.name.charAt(0)}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePlay(voice.id)}
                        className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl ${
                          viewMode === 'list' ? '' : ''
                        }`}
                      >
                        {playingId === voice.id ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className={viewMode === 'list' ? 'flex-1' : ''}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{voice.name}</h3>
                        {voice.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-[#a1a1a1] mt-1">
                        {voice.language} • {voice.gender}
                        {voice.accent && ` • ${voice.accent}`}
                      </p>
                      {voice.description && viewMode === 'grid' && (
                        <p className="text-xs text-[#666] mt-2 line-clamp-2">
                          {voice.description}
                        </p>
                      )}
                      {voice.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm text-[#a1a1a1]">{voice.rating}</span>
                          <span className="text-xs text-[#666] ml-2">
                            {voice.usageCount?.toLocaleString()} uses
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-2 ${viewMode === 'list' ? '' : 'mt-4'}`}>
                      <button
                        onClick={() => toggleFavorite(voice.id)}
                        className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                      >
                        <Heart className={`w-4 h-4 ${voice.isFavorite ? 'text-red-500 fill-red-500' : 'text-[#a1a1a1]'}`} />
                      </button>
                      <Link
                        href={`/app/speech-synthesis?voice=${voice.id}`}
                        className="flex-1 py-2 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg text-center transition"
                      >
                        Use Voice
                      </Link>
                      <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition">
                        <MoreVertical className="w-4 h-4 text-[#a1a1a1]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredVoices.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-[#a1a1a1]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No voices found</h3>
                <p className="text-[#a1a1a1] mb-4">
                  Try adjusting your search or filters
                </p>
                <Link
                  href="/app/voice-cloning"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Voice</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
