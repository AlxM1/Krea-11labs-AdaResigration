'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Zap
} from 'lucide-react'

interface TopBarProps {
  credits?: number
  maxCredits?: number
  userName?: string
  userPlan?: string
}

export default function TopBar({
  credits = 8500,
  maxCredits = 10000,
  userName = 'User',
  userPlan = 'Free'
}: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const creditPercentage = (credits / maxCredits) * 100

  return (
    <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-6">
      {/* Left side - Breadcrumb or Title */}
      <div className="flex items-center gap-4">
        {/* Can add breadcrumbs here */}
      </div>

      {/* Right side - Credits, Notifications, User */}
      <div className="flex items-center gap-4">
        {/* Credits Display */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#1f1f1f] rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#7c3aed]" />
            <span className="text-sm text-white font-medium">
              {credits.toLocaleString()}
            </span>
            <span className="text-sm text-[#a1a1a1]">
              / {maxCredits.toLocaleString()}
            </span>
          </div>
          <div className="w-24 h-1.5 bg-[#2f2f2f] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7c3aed] to-[#db2777] rounded-full transition-all"
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
        </div>

        {/* Upgrade Button */}
        {userPlan === 'Free' && (
          <Link
            href="/app/subscription"
            className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
          >
            Upgrade
          </Link>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50">
              <div className="p-4 border-b border-[#2f2f2f]">
                <h3 className="font-medium text-white">Notifications</h3>
              </div>
              <div className="p-4 text-center text-[#a1a1a1] text-sm">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-[#1f1f1f] rounded-lg transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#a1a1a1]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50 py-2">
              <div className="px-4 py-3 border-b border-[#2f2f2f]">
                <p className="font-medium text-white">{userName}</p>
                <p className="text-sm text-[#a1a1a1]">{userPlan} Plan</p>
              </div>

              <div className="py-2">
                <Link
                  href="/app/profile"
                  className="flex items-center gap-3 px-4 py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profile</span>
                </Link>
                <Link
                  href="/app/subscription"
                  className="flex items-center gap-3 px-4 py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Subscription</span>
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center gap-3 px-4 py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </Link>
                <Link
                  href="/help"
                  className="flex items-center gap-3 px-4 py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm">Help Center</span>
                </Link>
              </div>

              <div className="border-t border-[#2f2f2f] pt-2">
                <button
                  className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-400 hover:text-red-300 hover:bg-[#1f1f1f] transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
