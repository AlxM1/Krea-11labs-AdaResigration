'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  Play,
  Pause,
  Download,
  Trash2,
  Volume2,
  Mic,
  Music,
  FileAudio,
  Calendar,
  Clock,
  MoreVertical,
  ChevronDown
} from 'lucide-react'

type GenerationType = 'tts' | 'voice_clone' | 'sound_effect' | 'stt'

interface HistoryItem {
  id: string
  type: GenerationType
  title: string
  content?: string
  voiceName?: string
  duration?: number
  characters?: number
  createdAt: Date
  audioUrl?: string
}

const sampleHistory: HistoryItem[] = [
  {
    id: '1',
    type: 'tts',
    title: 'Welcome message for website',
    content: 'Welcome to our platform! We\'re excited to have you here.',
    voiceName: 'Rachel',
    duration: 5,
    characters: 56,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    audioUrl: '/audio/sample.mp3'
  },
  {
    id: '2',
    type: 'tts',
    title: 'Product description narration',
    content: 'Introducing our revolutionary new product that will change how you work.',
    voiceName: 'Adam',
    duration: 8,
    characters: 78,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    audioUrl: '/audio/sample.mp3'
  },
  {
    id: '3',
    type: 'voice_clone',
    title: 'My Voice Clone',
    voiceName: 'Custom Clone',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    id: '4',
    type: 'sound_effect',
    title: 'Thunderstorm ambiance',
    duration: 30,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    audioUrl: '/audio/sample.mp3'
  },
  {
    id: '5',
    type: 'tts',
    title: 'Training module intro',
    content: 'In this training module, you will learn the fundamentals of our platform.',
    voiceName: 'Emily',
    duration: 7,
    characters: 82,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    audioUrl: '/audio/sample.mp3'
  },
  {
    id: '6',
    type: 'stt',
    title: 'Meeting transcript',
    content: 'Transcribed audio from the quarterly planning meeting.',
    duration: 3600,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
  }
]

export default function HistoryPage() {
  const [history, setHistory] = useState(sampleHistory)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<GenerationType | 'all'>('all')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const filteredHistory = history
    .filter(item => {
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterType !== 'all' && item.type !== filterType) return false
      if (dateRange !== 'all') {
        const days = parseInt(dateRange)
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        if (item.createdAt.getTime() < cutoff) return false
      }
      return true
    })

  const getTypeIcon = (type: GenerationType) => {
    switch (type) {
      case 'tts': return Volume2
      case 'voice_clone': return Mic
      case 'sound_effect': return Music
      case 'stt': return FileAudio
    }
  }

  const getTypeLabel = (type: GenerationType) => {
    switch (type) {
      case 'tts': return 'Text to Speech'
      case 'voice_clone': return 'Voice Clone'
      case 'sound_effect': return 'Sound Effect'
      case 'stt': return 'Transcription'
    }
  }

  const getTypeColor = (type: GenerationType) => {
    switch (type) {
      case 'tts': return 'bg-[#7c3aed]/20 text-[#7c3aed]'
      case 'voice_clone': return 'bg-pink-500/20 text-pink-400'
      case 'sound_effect': return 'bg-blue-500/20 text-blue-400'
      case 'stt': return 'bg-green-500/20 text-green-400'
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id)
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredHistory.map(h => h.id)))
    }
  }

  const deleteSelected = () => {
    setHistory(prev => prev.filter(h => !selectedItems.has(h.id)))
    setSelectedItems(new Set())
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            View all your past generations and creations
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]"
          >
            <option value="all">All Types</option>
            <option value="tts">Text to Speech</option>
            <option value="voice_clone">Voice Clones</option>
            <option value="sound_effect">Sound Effects</option>
            <option value="stt">Transcriptions</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-[#1f1f1f] rounded-xl">
            <span className="text-sm text-[#a1a1a1]">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </span>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg text-sm transition">
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={deleteSelected}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}

        {/* History List */}
        <div className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2f2f2f] text-sm text-[#666]">
            <input
              type="checkbox"
              checked={selectedItems.size === filteredHistory.length && filteredHistory.length > 0}
              onChange={selectAll}
              className="rounded border-[#2f2f2f]"
            />
            <span className="flex-1">Item</span>
            <span className="w-32">Type</span>
            <span className="w-24">Duration</span>
            <span className="w-32">Date</span>
            <span className="w-24">Actions</span>
          </div>

          {/* Items */}
          {filteredHistory.length > 0 ? (
            <div className="divide-y divide-[#2f2f2f]">
              {filteredHistory.map((item) => {
                const TypeIcon = getTypeIcon(item.type)
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#151515] transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-[#2f2f2f]"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(item.type)}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.content && (
                            <p className="text-sm text-[#666] truncate">{item.content}</p>
                          )}
                          {item.voiceName && (
                            <p className="text-xs text-[#7c3aed]">{item.voiceName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-32">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${getTypeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>

                    <div className="w-24 text-sm text-[#a1a1a1]">
                      {formatDuration(item.duration)}
                    </div>

                    <div className="w-32 text-sm text-[#a1a1a1]">
                      {formatTimeAgo(item.createdAt)}
                    </div>

                    <div className="w-24 flex items-center gap-1">
                      {item.audioUrl && (
                        <button
                          onClick={() => togglePlay(item.id)}
                          className={`p-2 rounded-lg transition ${
                            playingId === item.id
                              ? 'bg-[#7c3aed] text-white'
                              : 'hover:bg-[#2f2f2f] text-[#a1a1a1]'
                          }`}
                        >
                          {playingId === item.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {item.audioUrl && (
                        <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1]">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1]">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#2f2f2f] flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#a1a1a1]" />
              </div>
              <h3 className="text-lg font-medium mb-2">No history found</h3>
              <p className="text-[#a1a1a1]">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your generation history will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { label: 'Total Generations', value: history.filter(h => h.type === 'tts').length },
            { label: 'Voice Clones', value: history.filter(h => h.type === 'voice_clone').length },
            { label: 'Sound Effects', value: history.filter(h => h.type === 'sound_effect').length },
            { label: 'Transcriptions', value: history.filter(h => h.type === 'stt').length }
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1f1f1f] rounded-xl p-4 border border-[#2f2f2f]">
              <p className="text-sm text-[#a1a1a1]">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
