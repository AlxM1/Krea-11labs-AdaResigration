'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Download,
  Save,
  Trash2,
  ChevronDown,
  Volume2,
  GripVertical,
  Loader2,
  Settings,
  Clock,
  FileText,
  Users,
  MoreVertical,
  Sparkles
} from 'lucide-react'

interface ContentBlock {
  id: string
  type: 'text' | 'pause' | 'sound_effect'
  content: string
  voiceId?: string
  voiceName?: string
  duration?: number
  audioUrl?: string
  isGenerating?: boolean
  isPlaying?: boolean
}

interface Voice {
  id: string
  name: string
  category: 'premade' | 'cloned'
}

const sampleVoices: Voice[] = [
  { id: '1', name: 'Rachel', category: 'premade' },
  { id: '2', name: 'Adam', category: 'premade' },
  { id: '3', name: 'Emily', category: 'premade' },
  { id: '4', name: 'My Voice Clone', category: 'cloned' },
]

export default function ProjectEditorPage({ params }: { params: { id: string } }) {
  const [projectName, setProjectName] = useState('Untitled Project')
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    {
      id: '1',
      type: 'text',
      content: 'Welcome to the VoiceForge Studio. This is where you can create long-form audio content with multiple voices.',
      voiceId: '1',
      voiceName: 'Rachel'
    },
    {
      id: '2',
      type: 'pause',
      content: '1',
      duration: 1
    },
    {
      id: '3',
      type: 'text',
      content: 'You can add different speakers, pauses, and even sound effects to create professional audiobooks, podcasts, and more.',
      voiceId: '2',
      voiceName: 'Adam'
    }
  ])

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [defaultVoice, setDefaultVoice] = useState(sampleVoices[0])
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showVoiceDropdown, setShowVoiceDropdown] = useState<string | null>(null)
  const [playingBlockId, setPlayingBlockId] = useState<string | null>(null)

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const totalWordCount = blocks
    .filter(b => b.type === 'text')
    .reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0)

  const estimatedDuration = Math.ceil(totalWordCount / 150 * 60) // ~150 words per minute

  const addBlock = (type: ContentBlock['type'], afterId?: string) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: type === 'pause' ? '1' : '',
      voiceId: type === 'text' ? defaultVoice.id : undefined,
      voiceName: type === 'text' ? defaultVoice.name : undefined
    }

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId)
      setBlocks(prev => [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1)
      ])
    } else {
      setBlocks(prev => [...prev, newBlock])
    }

    if (type === 'text') {
      setSelectedBlockId(newBlock.id)
    }
  }

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  const setVoiceForBlock = (blockId: string, voice: Voice) => {
    updateBlock(blockId, { voiceId: voice.id, voiceName: voice.name })
    setShowVoiceDropdown(null)
  }

  const generateBlockAudio = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block || block.type !== 'text' || !block.content.trim()) return

    updateBlock(blockId, { isGenerating: true })

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In production, this would be a real API call
      updateBlock(blockId, {
        isGenerating: false,
        audioUrl: '/audio/sample.mp3',
        duration: Math.ceil(block.content.split(/\s+/).length / 150 * 60)
      })
    } catch (error) {
      updateBlock(blockId, { isGenerating: false })
    }
  }

  const generateAllAudio = async () => {
    setIsGeneratingAll(true)

    const textBlocks = blocks.filter(b => b.type === 'text' && b.content.trim())

    for (const block of textBlocks) {
      await generateBlockAudio(block.id)
    }

    setIsGeneratingAll(false)
  }

  const playBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block?.audioUrl) return

    // Stop any currently playing
    if (playingBlockId && audioRefs.current[playingBlockId]) {
      audioRefs.current[playingBlockId].pause()
    }

    if (playingBlockId === blockId) {
      setPlayingBlockId(null)
    } else {
      setPlayingBlockId(blockId)
      // In production, would actually play the audio
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const handleExport = () => {
    // Export functionality
    alert('Export functionality coming soon!')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-[#2f2f2f] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app/projects"
              className="p-2 hover:bg-[#1f1f1f] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-xl font-bold bg-transparent border-none focus:outline-none focus:bg-[#1f1f1f] px-2 py-1 rounded"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-[#a1a1a1]">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {totalWordCount.toLocaleString()} words
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ~{formatDuration(estimatedDuration)}
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {new Set(blocks.filter(b => b.voiceId).map(b => b.voiceId)).size} voices
              </span>
            </div>

            {/* Actions */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save</span>
            </button>

            <button
              onClick={generateAllAudio}
              disabled={isGeneratingAll}
              className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
            >
              {isGeneratingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isGeneratingAll ? 'Generating...' : 'Generate All'}</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Editor */}
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Default Voice Selector */}
            <div className="flex items-center justify-between p-4 bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] mb-6">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-[#7c3aed]" />
                <span className="text-sm text-[#a1a1a1]">Default voice:</span>
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(showVoiceDropdown === 'default' ? null : 'default')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                  >
                    <span className="font-medium">{defaultVoice.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showVoiceDropdown === 'default' && (
                    <VoiceDropdown
                      voices={sampleVoices}
                      onSelect={(v) => {
                        setDefaultVoice(v)
                        setShowVoiceDropdown(null)
                      }}
                      onClose={() => setShowVoiceDropdown(null)}
                    />
                  )}
                </div>
              </div>
              <p className="text-xs text-[#666]">
                New text blocks will use this voice by default
              </p>
            </div>

            {/* Content Blocks */}
            {blocks.map((block, index) => (
              <div key={block.id} className="group">
                {block.type === 'text' ? (
                  <TextBlock
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onDelete={() => deleteBlock(block.id)}
                    onGenerate={() => generateBlockAudio(block.id)}
                    onPlay={() => playBlock(block.id)}
                    isPlaying={playingBlockId === block.id}
                    voices={sampleVoices}
                    showVoiceDropdown={showVoiceDropdown === block.id}
                    onToggleVoiceDropdown={() => setShowVoiceDropdown(showVoiceDropdown === block.id ? null : block.id)}
                    onSelectVoice={(v) => setVoiceForBlock(block.id, v)}
                    onCloseVoiceDropdown={() => setShowVoiceDropdown(null)}
                  />
                ) : block.type === 'pause' ? (
                  <PauseBlock
                    block={block}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ) : null}

                {/* Add Block Button */}
                <div className="flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addBlock('text', block.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" />
                      Text
                    </button>
                    <button
                      onClick={() => addBlock('pause', block.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" />
                      Pause
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add First Block */}
            {blocks.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#a1a1a1] mb-4">Start by adding content to your project</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => addBlock('text')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text Block
                  </button>
                </div>
              </div>
            )}

            {/* Add Block at End */}
            {blocks.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <button
                  onClick={() => addBlock('text')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Block
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Settings */}
        <div className="w-80 border-l border-[#2f2f2f] p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Project Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#a1a1a1] mb-2">Output Format</label>
                <select className="w-full px-3 py-2 bg-[#1f1f1f] border border-[#2f2f2f] rounded-lg">
                  <option>MP3 (128 kbps)</option>
                  <option>MP3 (192 kbps)</option>
                  <option>MP3 (320 kbps)</option>
                  <option>WAV (16-bit)</option>
                  <option>FLAC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#a1a1a1] mb-2">Sample Rate</label>
                <select className="w-full px-3 py-2 bg-[#1f1f1f] border border-[#2f2f2f] rounded-lg">
                  <option>44100 Hz</option>
                  <option>48000 Hz</option>
                  <option>22050 Hz</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-[#2f2f2f]" />

          <div>
            <h3 className="font-semibold mb-4">Voices Used</h3>
            <div className="space-y-2">
              {Array.from(new Set(blocks.filter(b => b.voiceName).map(b => b.voiceName))).map((name) => (
                <div key={name} className="flex items-center gap-3 p-2 bg-[#1f1f1f] rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">{name?.charAt(0)}</span>
                  </div>
                  <span className="text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-[#2f2f2f]" />

          <div>
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition text-sm">
                <Play className="w-4 h-4" />
                Preview All
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition text-sm">
                <Download className="w-4 h-4" />
                Export Audio
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] hover:bg-[#2f2f2f] rounded-lg transition text-sm">
                <FileText className="w-4 h-4" />
                Export Script
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TextBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onGenerate,
  onPlay,
  isPlaying,
  voices,
  showVoiceDropdown,
  onToggleVoiceDropdown,
  onSelectVoice,
  onCloseVoiceDropdown
}: {
  block: ContentBlock
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<ContentBlock>) => void
  onDelete: () => void
  onGenerate: () => void
  onPlay: () => void
  isPlaying: boolean
  voices: Voice[]
  showVoiceDropdown: boolean
  onToggleVoiceDropdown: () => void
  onSelectVoice: (voice: Voice) => void
  onCloseVoiceDropdown: () => void
}) {
  return (
    <div
      className={`bg-[#1f1f1f] rounded-xl border transition ${
        isSelected ? 'border-[#7c3aed]' : 'border-[#2f2f2f] hover:border-[#3f3f3f]'
      }`}
      onClick={onSelect}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f2f2f]">
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-[#666] cursor-grab" />
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleVoiceDropdown()
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold">{block.voiceName?.charAt(0)}</span>
              </div>
              <span className="text-sm font-medium">{block.voiceName}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showVoiceDropdown && (
              <VoiceDropdown
                voices={voices}
                onSelect={onSelectVoice}
                onClose={onCloseVoiceDropdown}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {block.audioUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
              className={`p-2 rounded-lg transition ${
                isPlaying ? 'bg-[#7c3aed]' : 'hover:bg-[#2f2f2f]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 text-[#a1a1a1]" />
              )}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onGenerate()
            }}
            disabled={block.isGenerating || !block.content.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/30 disabled:opacity-50 rounded-lg transition"
          >
            {block.isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{block.isGenerating ? 'Generating...' : 'Generate'}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2 hover:bg-[#2f2f2f] rounded-lg transition text-[#a1a1a1] hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Content */}
      <textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="Enter your text here..."
        className="w-full p-4 bg-transparent text-white placeholder-[#666] resize-none focus:outline-none min-h-[100px]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Block Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#2f2f2f] text-xs text-[#666]">
        <span>{block.content.split(/\s+/).filter(Boolean).length} words</span>
        {block.duration && <span>~{block.duration}s</span>}
      </div>
    </div>
  )
}

function PauseBlock({
  block,
  onUpdate,
  onDelete
}: {
  block: ContentBlock
  onUpdate: (updates: Partial<ContentBlock>) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[#1f1f1f]/50 rounded-xl border border-dashed border-[#2f2f2f]">
      <GripVertical className="w-4 h-4 text-[#666] cursor-grab" />
      <Clock className="w-4 h-4 text-[#a1a1a1]" />
      <span className="text-sm text-[#a1a1a1]">Pause</span>
      <input
        type="number"
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value, duration: parseFloat(e.target.value) })}
        min="0.1"
        max="10"
        step="0.1"
        className="w-16 px-2 py-1 text-sm bg-[#2f2f2f] border border-[#3f3f3f] rounded text-center"
      />
      <span className="text-sm text-[#a1a1a1]">seconds</span>
      <div className="flex-1" />
      <button
        onClick={onDelete}
        className="p-1 hover:bg-[#2f2f2f] rounded transition text-[#a1a1a1] hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function VoiceDropdown({
  voices,
  onSelect,
  onClose
}: {
  voices: Voice[]
  onSelect: (voice: Voice) => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50 py-2 max-h-64 overflow-y-auto">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(voice)
            }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2f2f2f] transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">{voice.name.charAt(0)}</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{voice.name}</p>
              <p className="text-xs text-[#666] capitalize">{voice.category}</p>
            </div>
          </button>
        ))}
        <hr className="my-2 border-[#2f2f2f]" />
        <Link
          href="/app/voices"
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#7c3aed] hover:bg-[#2f2f2f] transition"
        >
          <Plus className="w-4 h-4" />
          Browse More Voices
        </Link>
      </div>
    </>
  )
}
