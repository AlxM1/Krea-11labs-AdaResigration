'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Zap,
  Menu
} from 'lucide-react'

interface TopBarProps {
  credits?: number
  maxCredits?: number
  userName?: string
  userPlan?: string
  onMenuClick?: () => void
}

export default function TopBar({
  credits = 8500,
  maxCredits = 10000,
  userName = 'User',
  userPlan = 'Free',
  onMenuClick
}: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const creditPercentage = (credits / maxCredits) * 100

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-14 sm:h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-3 sm:px-4 lg:px-6">
      {/* Left side - Mobile menu button + Logo on mobile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] rounded-lg transition touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Mobile Logo */}
        <Link href="/app" className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm sm:text-base text-white hidden xs:inline">VoiceForge</span>
        </Link>
      </div>

      {/* Right side - Credits, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Credits Display - Simplified on mobile */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-[#1f1f1f] rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7c3aed]" />
            <span className="text-xs sm:text-sm text-white font-medium">
              {credits.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-[#a1a1a1] hidden md:inline">
              / {maxCredits.toLocaleString()}
            </span>
          </div>
          <div className="hidden md:block w-16 lg:w-24 h-1.5 bg-[#2f2f2f] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7c3aed] to-[#db2777] rounded-full transition-all"
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
        </div>

        {/* Mobile credits (just icon + number) */}
        <div className="flex sm:hidden items-center gap-1 px-2 py-1.5 bg-[#1f1f1f] rounded-lg">
          <Zap className="w-3.5 h-3.5 text-[#7c3aed]" />
          <span className="text-xs text-white font-medium">
            {(credits / 1000).toFixed(1)}k
          </span>
        </div>

        {/* Upgrade Button - Hidden on small mobile */}
        {userPlan === 'Free' && (
          <Link
            href="/app/subscription"
            className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#7c3aed] to-[#db2777] text-white text-xs sm:text-sm font-medium rounded-lg hover:opacity-90 active:opacity-80 transition touch-manipulation"
          >
            <span className="hidden md:inline">Upgrade</span>
            <span className="md:hidden">Pro</span>
          </Link>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowUserMenu(false)
            }}
            className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] rounded-lg transition touch-manipulation"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 sm:top-12 w-[calc(100vw-1.5rem)] sm:w-80 max-w-[320px] bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50">
              <div className="p-3 sm:p-4 border-b border-[#2f2f2f]">
                <h3 className="font-medium text-white text-sm sm:text-base">Notifications</h3>
              </div>
              <div className="p-3 sm:p-4 text-center text-[#a1a1a1] text-xs sm:text-sm">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 hover:bg-[#1f1f1f] rounded-lg transition touch-manipulation"
            aria-label="User menu"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#7c3aed] to-[#db2777] rounded-full flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a1a1a1] hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 sm:top-12 w-[calc(100vw-1.5rem)] sm:w-56 max-w-[224px] bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-2xl z-50 py-2">
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[#2f2f2f]">
                <p className="font-medium text-white text-sm sm:text-base truncate">{userName}</p>
                <p className="text-xs sm:text-sm text-[#a1a1a1]">{userPlan} Plan</p>
              </div>

              <div className="py-1 sm:py-2">
                <Link
                  href="/app/profile"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] active:bg-[#2f2f2f] transition touch-manipulation"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profile</span>
                </Link>
                <Link
                  href="/app/subscription"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] active:bg-[#2f2f2f] transition touch-manipulation"
                  onClick={() => setShowUserMenu(false)}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Subscription</span>
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] active:bg-[#2f2f2f] transition touch-manipulation"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </Link>
                <Link
                  href="/help"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2 text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] active:bg-[#2f2f2f] transition touch-manipulation"
                  onClick={() => setShowUserMenu(false)}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm">Help Center</span>
                </Link>
              </div>

              <div className="border-t border-[#2f2f2f] pt-1 sm:pt-2">
                <button
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 w-full text-left text-red-400 hover:text-red-300 hover:bg-[#1f1f1f] active:bg-[#2f2f2f] transition touch-manipulation"
                  onClick={() => setShowUserMenu(false)}
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
