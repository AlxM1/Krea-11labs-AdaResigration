'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles, Check } from 'lucide-react'

const features = [
  '10,000 characters free per month',
  'Access to 30+ premium voices',
  'Instant voice cloning',
  'High-quality audio exports',
  'API access included'
]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const passwordStrength = () => {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++
    return score
  }

  const getPasswordStrengthLabel = () => {
    const strength = passwordStrength()
    if (strength === 0) return { label: '', color: '' }
    if (strength === 1) return { label: 'Weak', color: 'bg-red-500' }
    if (strength === 2) return { label: 'Fair', color: 'bg-yellow-500' }
    if (strength === 3) return { label: 'Good', color: 'bg-blue-500' }
    return { label: 'Strong', color: 'bg-green-500' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service')
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Registration failed')
      }

      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const strength = getPasswordStrengthLabel()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#db2777] p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">VoiceForge</span>
          </Link>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-6">
            Start creating with AI voices today
          </h1>
          <ul className="space-y-4">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
          <p className="text-white/90 mb-4">
            "VoiceForge has transformed how we create content. The voice quality is incredible!"
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20" />
            <div>
              <p className="font-medium text-white">Sarah Johnson</p>
              <p className="text-sm text-white/70">Content Creator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-[#7c3aed]" />
              <span className="text-2xl font-bold text-white">VoiceForge</span>
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
          <p className="text-[#a1a1a1] mb-8">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7c3aed] hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-12 py-3 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#7c3aed]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i <= passwordStrength() ? strength.color : 'bg-[#2f2f2f]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#666]">
                    Password strength: <span className="text-white">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border-[#2f2f2f]"
              />
              <span className="text-sm text-[#a1a1a1]">
                I agree to the{' '}
                <Link href="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 rounded-xl font-medium text-white transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2f2f2f]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0a0a0a] text-[#666]">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 bg-[#1f1f1f] border border-[#2f2f2f] hover:border-[#3f3f3f] rounded-xl transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-white text-sm">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-[#1f1f1f] border border-[#2f2f2f] hover:border-[#3f3f3f] rounded-xl transition">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-white text-sm">GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
