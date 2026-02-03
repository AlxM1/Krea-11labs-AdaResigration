'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const handleMenuClick = useCallback(() => {
    setMobileMenuOpen(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={handleMobileClose} />

      {/* Main content area - responsive margin */}
      <div className="lg:ml-[240px] transition-all duration-300">
        <TopBar
          credits={8500}
          maxCredits={10000}
          userName="Demo User"
          userPlan="Free"
          onMenuClick={handleMenuClick}
        />
        <main className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
