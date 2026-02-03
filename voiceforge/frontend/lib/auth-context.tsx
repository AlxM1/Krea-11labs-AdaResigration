'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  plan: string
  characters_used: number
  characters_limit: number
  created_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        return
      }

      api.setToken(token)
      const userData = await api.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }
    initAuth()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password)
    localStorage.setItem('token', data.access_token)
    api.setToken(data.access_token)
    await refreshUser()
    router.push('/app')
  }

  const register = async (name: string, email: string, password: string) => {
    const data = await api.register(email, password, name)
    localStorage.setItem('token', data.access_token)
    api.setToken(data.access_token)
    await refreshUser()
    router.push('/app')
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected route component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7c3aed]"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

// Hook for getting usage stats
export function useUsage() {
  const [usage, setUsage] = useState({
    charactersUsed: 0,
    charactersLimit: 10000,
    percentage: 0
  })
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const percentage = (user.characters_used / user.characters_limit) * 100
      setUsage({
        charactersUsed: user.characters_used,
        charactersLimit: user.characters_limit,
        percentage: Math.min(percentage, 100)
      })
    }
  }, [user])

  return usage
}
