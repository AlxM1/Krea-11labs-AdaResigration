'use client'

import { useState } from 'react'
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Check,
  AlertTriangle,
  Clock,
  Activity,
  ExternalLink
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: Date
  lastUsed?: Date
  usageCount: number
}

const sampleKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production App',
    key: 'vf_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-01-20'),
    usageCount: 1523
  },
  {
    id: '2',
    name: 'Development',
    key: 'vf_sk_test_yyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    createdAt: new Date('2024-01-10'),
    lastUsed: new Date('2024-01-18'),
    usageCount: 842
  }
]

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(sampleKeys)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newCreatedKey, setNewCreatedKey] = useState<string | null>(null)

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyKey = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(32)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const createKey = () => {
    if (!newKeyName.trim()) return

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `vf_sk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      createdAt: new Date(),
      usageCount: 0
    }

    setKeys(prev => [newKey, ...prev])
    setNewCreatedKey(newKey.key)
    setNewKeyName('')
  }

  const deleteKey = (id: string) => {
    setKeys(prev => prev.filter(k => k.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-[#a1a1a1] text-sm mt-1">
              Manage your API keys for programmatic access
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Key</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-400 font-medium">Keep your API keys secure</p>
              <p className="text-sm text-[#a1a1a1] mt-1">
                Never share your API keys or commit them to version control.
                Use environment variables to store them securely.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {keys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-[#7c3aed]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{apiKey.name}</h3>
                    <p className="text-xs text-[#666]">Created {formatDate(apiKey.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(apiKey.id)}
                  className="p-2 text-[#666] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Key Display */}
              <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded-xl mb-4">
                <code className="flex-1 text-sm font-mono text-[#a1a1a1]">
                  {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                </code>
                <button
                  onClick={() => toggleKeyVisibility(apiKey.id)}
                  className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                >
                  {visibleKeys.has(apiKey.id) ? (
                    <EyeOff className="w-4 h-4 text-[#a1a1a1]" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#a1a1a1]" />
                  )}
                </button>
                <button
                  onClick={() => copyKey(apiKey.key, apiKey.id)}
                  className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                >
                  {copiedKey === apiKey.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#a1a1a1]" />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-[#666]">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {apiKey.usageCount.toLocaleString()} requests
                </span>
                {apiKey.lastUsed && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last used {formatDate(apiKey.lastUsed)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {keys.length === 0 && (
          <div className="text-center py-16 bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f]">
            <div className="w-16 h-16 rounded-full bg-[#2f2f2f] flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-[#a1a1a1]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
            <p className="text-[#a1a1a1] mb-4">
              Create an API key to start using VoiceForge programmatically
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          </div>
        )}

        {/* Documentation Link */}
        <div className="mt-8 p-6 bg-[#1f1f1f] rounded-2xl border border-[#2f2f2f]">
          <h3 className="font-semibold mb-2">API Documentation</h3>
          <p className="text-sm text-[#a1a1a1] mb-4">
            Learn how to integrate VoiceForge into your applications with our comprehensive API documentation.
          </p>
          <a
            href="/docs/api"
            className="inline-flex items-center gap-2 text-[#7c3aed] hover:underline"
          >
            View Documentation
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Create Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => {
              setShowCreateModal(false)
              setNewCreatedKey(null)
              setNewKeyName('')
            }} />
            <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl p-6 w-full max-w-md">
              {newCreatedKey ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-center mb-2">API Key Created</h2>
                  <p className="text-[#a1a1a1] text-center text-sm mb-6">
                    Copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded-xl mb-6">
                    <code className="flex-1 text-sm font-mono text-[#a1a1a1] break-all">
                      {newCreatedKey}
                    </code>
                    <button
                      onClick={() => copyKey(newCreatedKey, 'new')}
                      className="p-2 hover:bg-[#2f2f2f] rounded-lg transition flex-shrink-0"
                    >
                      {copiedKey === 'new' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#a1a1a1]" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewCreatedKey(null)
                    }}
                    className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-medium transition"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-4">Create API Key</h2>
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Key Name</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production App"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2f2f2f] rounded-xl focus:outline-none focus:border-[#7c3aed]"
                      autoFocus
                    />
                    <p className="text-xs text-[#666] mt-2">
                      Give your key a descriptive name to remember its purpose
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewKeyName('')
                      }}
                      className="flex-1 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createKey}
                      disabled={!newKeyName.trim()}
                      className="flex-1 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 rounded-xl font-medium transition"
                    >
                      Create Key
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteModal(null)} />
            <div className="relative bg-[#1a1a1a] border border-[#2f2f2f] rounded-2xl p-6 w-full max-w-md">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Delete API Key</h2>
              <p className="text-[#a1a1a1] text-center mb-6">
                This action cannot be undone. Any applications using this key will stop working.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteKey(showDeleteModal)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition"
                >
                  Delete Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
