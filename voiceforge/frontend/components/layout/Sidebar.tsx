'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Volume2,
  Mic,
  FileAudio,
  Wand2,
  FolderOpen,
  Library,
  Languages,
  Settings,
  Key,
  ChevronLeft,
  ChevronRight,
  Headphones,
  MessageSquare,
  Zap,
  Crown
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
}

const mainNavItems: NavItem[] = [
  { name: 'Speech Synthesis', href: '/app/speech-synthesis', icon: Volume2 },
  { name: 'Projects', href: '/app/projects', icon: FolderOpen },
  { name: 'Voice Library', href: '/app/voices', icon: Library },
  { name: 'Voice Cloning', href: '/app/voice-cloning', icon: Mic, badge: 'NEW' },
  { name: 'Speech to Text', href: '/app/speech-to-text', icon: FileAudio },
  { name: 'Sound Effects', href: '/app/sound-effects', icon: Wand2 },
  { name: 'Dubbing', href: '/app/dubbing', icon: Languages, badge: 'BETA' },
  { name: 'Voice Isolator', href: '/app/voice-isolator', icon: Headphones },
  { name: 'Conversational AI', href: '/app/agents', icon: MessageSquare, badge: 'NEW' },
]

const bottomNavItems: NavItem[] = [
  { name: 'API', href: '/app/api-keys', icon: Key },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0a0a0a] border-r border-[#1f1f1f] transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#1f1f1f]">
        <Link href="/app" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-white">VoiceForge</span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-[#1f1f1f] text-white'
                    : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]/50'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#7c3aed]' : ''}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#7c3aed] text-white rounded">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-[#1f1f1f] py-4">
        <div className="px-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#1f1f1f] text-white'
                    : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]/50'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Upgrade Banner */}
        {!collapsed && (
          <div className="mx-3 mt-4 p-3 bg-gradient-to-r from-[#7c3aed]/20 to-[#db2777]/20 rounded-lg border border-[#7c3aed]/30">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-sm font-medium text-white">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-[#a1a1a1] mb-2">
              Get 500,000 characters/month
            </p>
            <Link
              href="/app/subscription"
              className="block w-full py-1.5 text-center text-sm font-medium bg-[#7c3aed] text-white rounded-md hover:bg-[#6d28d9] transition"
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#1f1f1f] border border-[#2f2f2f] rounded-full flex items-center justify-center text-[#a1a1a1] hover:text-white transition"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  )
}
