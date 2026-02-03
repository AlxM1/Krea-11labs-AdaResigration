'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Volume2,
  Mic,
  FolderOpen,
  History,
  TrendingUp,
  Clock,
  Zap,
  ChevronRight,
  Play,
  Plus,
  ArrowUpRight,
  Sparkles,
  FileAudio,
  Users
} from 'lucide-react'

interface UsageStats {
  charactersUsed: number
  charactersLimit: number
  audioGenerated: number
  voicesCreated: number
  projectsActive: number
}

interface RecentActivity {
  id: string
  type: 'tts' | 'clone' | 'project'
  title: string
  subtitle: string
  timestamp: Date
  audioUrl?: string
}

const stats: UsageStats = {
  charactersUsed: 45000,
  charactersLimit: 100000,
  audioGenerated: 128,
  voicesCreated: 5,
  projectsActive: 3
}

const recentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'tts',
    title: 'Welcome Message',
    subtitle: 'Generated with Rachel',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    audioUrl: '/audio/sample.mp3'
  },
  {
    id: '2',
    type: 'project',
    title: 'Audiobook Chapter 1',
    subtitle: 'Updated 2 hours ago',
    timestamp: new Date(Date.now() - 1000 * 60 * 120)
  },
  {
    id: '3',
    type: 'clone',
    title: 'My Voice Clone',
    subtitle: 'Voice clone created',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    id: '4',
    type: 'tts',
    title: 'Product Description',
    subtitle: 'Generated with Adam',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48)
  }
]

const quickActions = [
  {
    title: 'Text to Speech',
    description: 'Convert text to natural speech',
    icon: Volume2,
    href: '/app/speech-synthesis',
    color: 'from-violet-500 to-purple-600'
  },
  {
    title: 'Clone a Voice',
    description: 'Create a voice from samples',
    icon: Mic,
    href: '/app/voice-cloning',
    color: 'from-pink-500 to-rose-600'
  },
  {
    title: 'New Project',
    description: 'Create long-form content',
    icon: FolderOpen,
    href: '/app/projects',
    color: 'from-blue-500 to-cyan-600'
  }
]

export default function DashboardPage() {
  const [playingId, setPlayingId] = useState<string | null>(null)

  const usagePercentage = (stats.charactersUsed / stats.charactersLimit) * 100

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'tts': return Volume2
      case 'clone': return Mic
      case 'project': return FolderOpen
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold">Welcome back</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">
            Here's what's happening with your account
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#1f1f1f] border border-[#2f2f2f] p-4 sm:p-6 hover:border-[#3f3f3f] active:border-[#4f4f4f] transition touch-manipulation"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition`} />
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 sm:mb-4`}>
                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg mb-1">{action.title}</h3>
              <p className="text-xs sm:text-sm text-[#a1a1a1]">{action.description}</p>
              <ArrowUpRight className="absolute top-4 right-4 sm:top-6 sm:right-6 w-4 h-4 sm:w-5 sm:h-5 text-[#666] group-hover:text-white transition" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Usage & Stats */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Usage Card */}
            <div className="bg-[#1f1f1f] rounded-xl sm:rounded-2xl border border-[#2f2f2f] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-semibold text-base sm:text-lg">Usage This Month</h2>
                <Link
                  href="/app/subscription"
                  className="text-sm text-[#7c3aed] hover:underline flex items-center gap-1"
                >
                  Upgrade plan
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Main Usage Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#a1a1a1]">Characters</span>
                  <span className="text-sm font-medium">
                    {formatNumber(stats.charactersUsed)} / {formatNumber(stats.charactersLimit)}
                  </span>
                </div>
                <div className="h-3 bg-[#2f2f2f] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercentage > 90 ? 'bg-red-500' :
                      usagePercentage > 70 ? 'bg-yellow-500' : 'bg-[#7c3aed]'
                    }`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-[#666] mt-2">
                  {(100 - usagePercentage).toFixed(0)}% of your monthly quota remaining
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-[#0a0a0a] rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[#a1a1a1] mb-1.5 sm:mb-2">
                    <FileAudio className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">Audio Generated</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.audioGenerated}</p>
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +12% from last month
                  </p>
                </div>

                <div className="bg-[#0a0a0a] rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[#a1a1a1] mb-1.5 sm:mb-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">Voices Created</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.voicesCreated}</p>
                  <p className="text-xs text-[#666] mt-1">
                    3 instant, 2 professional
                  </p>
                </div>

                <div className="bg-[#0a0a0a] rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[#a1a1a1] mb-1.5 sm:mb-2">
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">Active Projects</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.projectsActive}</p>
                  <Link href="/app/projects" className="text-xs text-[#7c3aed] hover:underline mt-1 block">
                    View all projects
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#1f1f1f] rounded-xl sm:rounded-2xl border border-[#2f2f2f] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-semibold text-base sm:text-lg">Recent Activity</h2>
                <Link
                  href="/app/history"
                  className="text-sm text-[#a1a1a1] hover:text-white flex items-center gap-1 transition"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-3 bg-[#0a0a0a] rounded-xl hover:bg-[#151515] transition"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#2f2f2f] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#a1a1a1]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.title}</p>
                        <p className="text-sm text-[#666] truncate">{activity.subtitle}</p>
                      </div>
                      <span className="text-xs text-[#666] flex-shrink-0">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.audioUrl && (
                        <button
                          onClick={() => setPlayingId(playingId === activity.id ? null : activity.id)}
                          className="p-2 hover:bg-[#2f2f2f] rounded-lg transition"
                        >
                          <Play className="w-4 h-4 text-[#a1a1a1]" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Plan & Quick Links */}
          <div className="space-y-4 sm:space-y-6">
            {/* Current Plan */}
            <div className="bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Free Plan</span>
              </div>
              <p className="text-sm text-white/80 mb-4">
                Upgrade to unlock more characters, voices, and features.
              </p>
              <Link
                href="/app/subscription"
                className="block w-full py-2 px-4 bg-white text-[#7c3aed] font-medium rounded-lg text-center hover:bg-white/90 transition"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* Quick Links */}
            <div className="bg-[#1f1f1f] rounded-xl sm:rounded-2xl border border-[#2f2f2f] p-4 sm:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4">Quick Links</h3>
              <div className="space-y-1 sm:space-y-2">
                <Link
                  href="/app/voices"
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-[#2f2f2f] active:bg-[#3f3f3f] rounded-lg sm:rounded-xl transition touch-manipulation"
                >
                  <span className="text-sm">Voice Library</span>
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                </Link>
                <Link
                  href="/app/api-keys"
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-[#2f2f2f] active:bg-[#3f3f3f] rounded-lg sm:rounded-xl transition touch-manipulation"
                >
                  <span className="text-sm">API Keys</span>
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-[#2f2f2f] active:bg-[#3f3f3f] rounded-lg sm:rounded-xl transition touch-manipulation"
                >
                  <span className="text-sm">Documentation</span>
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-[#2f2f2f] active:bg-[#3f3f3f] rounded-lg sm:rounded-xl transition touch-manipulation"
                >
                  <span className="text-sm">Account Settings</span>
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                </Link>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[#1f1f1f] rounded-xl sm:rounded-2xl border border-[#2f2f2f] p-4 sm:p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Pro Tip
              </h3>
              <p className="text-sm text-[#a1a1a1]">
                Use Projects for long-form content like audiobooks.
                It allows you to manage multiple voices, add pauses, and export the entire audio in one go.
              </p>
              <Link
                href="/app/projects"
                className="inline-block mt-3 text-sm text-[#7c3aed] hover:underline"
              >
                Try Projects →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
