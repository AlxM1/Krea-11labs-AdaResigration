'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Bot,
  Phone,
  MessageSquare,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Copy,
  Edit,
  ExternalLink,
  Zap,
  Globe,
  Mic,
  Volume2,
  Brain,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description?: string
  voiceId: string
  voiceName: string
  language: string
  personality?: string
  status: 'active' | 'inactive' | 'draft'
  calls?: number
  avgDuration?: number
  createdAt: Date
}

const sampleAgents: Agent[] = [
  {
    id: '1',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries and support tickets',
    voiceId: 'rachel',
    voiceName: 'Rachel',
    language: 'English',
    personality: 'Professional and helpful',
    status: 'active',
    calls: 1234,
    avgDuration: 180,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Sales Assistant',
    description: 'Qualifies leads and schedules demos',
    voiceId: 'adam',
    voiceName: 'Adam',
    language: 'English',
    personality: 'Friendly and persuasive',
    status: 'active',
    calls: 567,
    avgDuration: 240,
    createdAt: new Date('2024-01-10')
  },
  {
    id: '3',
    name: 'Appointment Scheduler',
    description: 'Books and manages appointments',
    voiceId: 'emily',
    voiceName: 'Emily',
    language: 'English',
    status: 'draft',
    createdAt: new Date('2024-01-20')
  }
]

export default function AgentsPage() {
  const [agents, setAgents] = useState(sampleAgents)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingAgent, setTestingAgent] = useState<string | null>(null)

  const filteredAgents = agents.filter(agent => {
    if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus !== 'all' && agent.status !== filterStatus) return false
    return true
  })

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'inactive': return 'bg-yellow-500/20 text-yellow-400'
      case 'draft': return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleAgentStatus = (id: string) => {
    setAgents(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
        : a
    ))
  }

  const deleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Conversational AI</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Create and manage AI voice agents for calls and chat
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Agent</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Agents', value: agents.length, icon: Bot },
            { label: 'Active Agents', value: agents.filter(a => a.status === 'active').length, icon: Zap },
            { label: 'Total Calls', value: agents.reduce((sum, a) => sum + (a.calls || 0), 0), icon: Phone },
            { label: 'Avg Duration', value: '3:45', icon: MessageSquare }
          ].map((stat, i) => (
            <div key={i} className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-4">
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className="w-5 h-5 text-[#7c3aed]" />
                <span className="text-sm text-[#a1a1a1]">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map(agent => (
            <div
              key={agent.id}
              className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] overflow-hidden hover:border-[#3f3f3f] transition"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#db2777] flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-[#2f2f2f] rounded-lg transition">
                    <MoreVertical className="w-4 h-4 text-[#666]" />
                  </button>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-sm text-[#a1a1a1] mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Volume2 className="w-4 h-4 text-[#666]" />
                    <span className="text-[#a1a1a1]">Voice:</span>
                    <span>{agent.voiceName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-[#666]" />
                    <span className="text-[#a1a1a1]">Language:</span>
                    <span>{agent.language}</span>
                  </div>
                  {agent.personality && (
                    <div className="flex items-center gap-2 text-sm">
                      <Brain className="w-4 h-4 text-[#666]" />
                      <span className="text-[#a1a1a1]">Personality:</span>
                      <span className="truncate">{agent.personality}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {agent.calls !== undefined && (
                  <div className="flex items-center gap-4 text-sm text-[#666] mb-4">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {agent.calls.toLocaleString()} calls
                    </span>
                    {agent.avgDuration && (
                      <span>Avg: {formatDuration(agent.avgDuration)}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTestingAgent(testingAgent === agent.id ? null : agent.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                      testingAgent === agent.id
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-[#2f2f2f] hover:bg-[#3f3f3f]'
                    }`}
                  >
                    {testingAgent === agent.id ? (
                      <>
                        <Pause className="w-4 h-4" />
                        End Test
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Test
                      </>
                    )}
                  </button>
                  <Link
                    href={`/app/agents/${agent.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-lg transition"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Create New Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1f1f1f] rounded-2xl border-2 border-dashed border-[#2f2f2f] hover:border-[#7c3aed] p-8 flex flex-col items-center justify-center gap-4 transition min-h-[280px]"
          >
            <div className="w-16 h-16 rounded-full bg-[#2f2f2f] flex items-center justify-center">
              <Plus className="w-8 h-8 text-[#a1a1a1]" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">Create New Agent</p>
              <p className="text-sm text-[#666]">Build a custom AI voice agent</p>
            </div>
          </button>
        </div>

        {/* Test Call Widget */}
        {testingAgent && (
          <div className="fixed bottom-6 right-6 w-80 bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="p-4 bg-gradient-to-r from-[#7c3aed] to-[#db2777]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Test Call</p>
                    <p className="text-sm text-white/70">
                      {agents.find(a => a.id === testingAgent)?.name}
                    </p>
                  </div>
                </div>
                <span className="text-sm">0:00</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex-1 h-8 bg-[#2f2f2f] rounded-full flex items-center justify-center gap-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#7c3aed] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 50}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button className="p-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-full transition">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTestingAgent(null)}
                  className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <button className="p-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-full transition">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateAgentModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </div>
  )
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [voice, setVoice] = useState('')
  const [language, setLanguage] = useState('en')
  const [personality, setPersonality] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')

  const handleCreate = () => {
    // Would create agent via API
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#2f2f2f]">
          <h2 className="text-xl font-bold">Create New Agent</h2>
          <p className="text-sm text-[#a1a1a1] mt-1">
            Step {step} of 3
          </p>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-[#7c3aed]' : 'bg-[#2f2f2f]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">Basic Information</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Customer Support Agent"
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this agent do?"
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl resize-none focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">Voice & Language</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="">Select a voice...</option>
                  <option value="rachel">Rachel - Female, Warm</option>
                  <option value="adam">Adam - Male, Professional</option>
                  <option value="emily">Emily - Female, Friendly</option>
                  <option value="james">James - Male, Authoritative</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Personality</label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="e.g., Professional, friendly, helpful"
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4">Behavior & Instructions</h3>
              <div>
                <label className="block text-sm font-medium mb-2">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful customer support agent for Acme Corp. Your role is to assist customers with their inquiries..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl resize-none focus:outline-none focus:border-[#7c3aed] font-mono text-sm"
                />
                <p className="text-xs text-[#666] mt-2">
                  Define how your agent should behave, its capabilities, and any constraints.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2f2f2f] flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2 text-[#a1a1a1] hover:text-white transition"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleCreate()}
            disabled={step === 1 && !name.trim()}
            className="px-6 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 rounded-xl font-medium transition"
          >
            {step < 3 ? 'Continue' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}
