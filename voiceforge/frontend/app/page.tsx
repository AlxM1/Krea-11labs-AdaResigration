'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mic,
  Volume2,
  Wand2,
  FileAudio,
  Sparkles,
  ArrowRight,
  Play,
  Users,
  Zap,
  Globe
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">11labs</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/text-to-speech" className="text-muted-foreground hover:text-foreground transition">
              Text to Speech
            </Link>
            <Link href="/voice-cloning" className="text-muted-foreground hover:text-foreground transition">
              Voice Cloning
            </Link>
            <Link href="/speech-to-text" className="text-muted-foreground hover:text-foreground transition">
              Speech to Text
            </Link>
            <Link href="/sound-effects" className="text-muted-foreground hover:text-foreground transition">
              Sound Effects
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full text-sm mb-8">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Powered by state-of-the-art AI models</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl mx-auto">
            Create <span className="gradient-text">lifelike voices</span> with AI
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Generate natural speech, clone voices, transcribe audio, and create sound effects.
            The most advanced AI voice platform for creators and developers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/text-to-speech"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2 text-lg"
            >
              Try for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/docs"
              className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg hover:bg-secondary/80 transition flex items-center justify-center gap-2 text-lg"
            >
              <Play className="w-5 h-5" />
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything you need for AI audio
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">
            From text-to-speech to voice cloning, we provide all the tools you need to create amazing audio content.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Text to Speech */}
            <Link href="/text-to-speech" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition">
                  <Volume2 className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Text to Speech</h3>
                <p className="text-muted-foreground">
                  Convert text to natural-sounding speech with emotion and expression.
                  32+ languages supported.
                </p>
              </div>
            </Link>

            {/* Voice Cloning */}
            <Link href="/voice-cloning" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition">
                  <Mic className="w-6 h-6 text-pink-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Voice Cloning</h3>
                <p className="text-muted-foreground">
                  Clone any voice from just a few seconds of audio.
                  Create custom voices for your projects.
                </p>
              </div>
            </Link>

            {/* Speech to Text */}
            <Link href="/speech-to-text" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition">
                  <FileAudio className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Speech to Text</h3>
                <p className="text-muted-foreground">
                  Transcribe audio with incredible accuracy.
                  Speaker detection and timestamps included.
                </p>
              </div>
            </Link>

            {/* Sound Effects */}
            <Link href="/sound-effects" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition">
                  <Wand2 className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Sound Effects</h3>
                <p className="text-muted-foreground">
                  Generate any sound effect from a text description.
                  Perfect for videos, games, and more.
                </p>
              </div>
            </Link>

            {/* Voice Isolation */}
            <Link href="/voice-isolation" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Voice Isolation</h3>
                <p className="text-muted-foreground">
                  Separate vocals from background noise and music.
                  Clean up any audio recording.
                </p>
              </div>
            </Link>

            {/* API Access */}
            <Link href="/docs/api" className="group">
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition">
                  <Zap className="w-6 h-6 text-cyan-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">API Access</h3>
                <p className="text-muted-foreground">
                  Integrate AI voice into your applications with our powerful API.
                  SDKs for Python and JavaScript.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">32+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">75ms</div>
              <div className="text-muted-foreground">Latency</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">1000+</div>
              <div className="text-muted-foreground">Voices</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">99%</div>
              <div className="text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Start creating with 10,000 free characters. No credit card required.
          </p>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-2 text-lg"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">11labs</span>
              </div>
              <p className="text-muted-foreground text-sm">
                The most advanced AI voice platform for creators and developers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/text-to-speech" className="hover:text-foreground transition">Text to Speech</Link></li>
                <li><Link href="/voice-cloning" className="hover:text-foreground transition">Voice Cloning</Link></li>
                <li><Link href="/speech-to-text" className="hover:text-foreground transition">Speech to Text</Link></li>
                <li><Link href="/sound-effects" className="hover:text-foreground transition">Sound Effects</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Developers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition">Documentation</Link></li>
                <li><Link href="/docs/api" className="hover:text-foreground transition">API Reference</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} 11labs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
