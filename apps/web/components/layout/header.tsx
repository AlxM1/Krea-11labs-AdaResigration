"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Box,
  Wand2,
  Layers,
  Menu,
  X,
  ChevronDown,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const generateLinks = [
  { href: "/image", label: "Image", icon: ImageIcon, description: "Generate images from text" },
  { href: "/video", label: "Video", icon: Video, description: "Create AI videos" },
  { href: "/realtime", label: "Real-time", icon: Zap, description: "Live AI canvas" },
  { href: "/3d", label: "3D", icon: Box, description: "Generate 3D objects" },
  { href: "/nodes", label: "Nodes", icon: Layers, description: "Build workflows" },
];

const toolLinks = [
  { href: "/enhancer", label: "Enhancer", description: "Upscale images up to 8x" },
  { href: "/editor", label: "Editor", description: "Edit images with AI" },
  { href: "/lipsync", label: "Lipsync", description: "Sync video to audio" },
  { href: "/motion-transfer", label: "Motion Transfer", description: "Animate images" },
  { href: "/video-restyle", label: "Video Restyle", description: "Change video style" },
  { href: "/train", label: "Train Model", description: "Create custom models" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">Krya</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Generate Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setGenerateOpen(true)}
            onMouseLeave={() => setGenerateOpen(false)}
          >
            <button
              className={cn(
                "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                "hover:bg-muted",
                generateOpen && "bg-muted"
              )}
            >
              Generate
              <ChevronDown className={cn("h-4 w-4 transition-transform", generateOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {generateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-full pt-2"
                >
                  <div className="w-64 rounded-xl border border-border bg-card p-2 shadow-xl">
                    {generateLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <link.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{link.label}</div>
                          <div className="text-xs text-muted-foreground">{link.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tools Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button
              className={cn(
                "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                "hover:bg-muted",
                toolsOpen && "bg-muted"
              )}
            >
              Tools
              <ChevronDown className={cn("h-4 w-4 transition-transform", toolsOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-full pt-2"
                >
                  <div className="w-64 rounded-xl border border-border bg-card p-2 shadow-xl">
                    {toolLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col rounded-lg p-3 hover:bg-muted transition-colors"
                      >
                        <div className="font-medium">{link.label}</div>
                        <div className="text-xs text-muted-foreground">{link.description}</div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/feed"
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            Gallery
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="hidden md:flex items-center gap-2 rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border"
          >
            <nav className="container mx-auto px-4 py-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Generate
              </div>
              {generateLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  {link.label}
                </Link>
              ))}

              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                Tools
              </div>
              {toolLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg p-2 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-border pt-4 mt-4">
                <Link
                  href="/feed"
                  className="block rounded-lg p-2 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Gallery
                </Link>
                <Link
                  href="/settings"
                  className="block rounded-lg p-2 hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
