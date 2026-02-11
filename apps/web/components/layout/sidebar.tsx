"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Wand2,
  Eraser,
  Hexagon,
  ArrowUpCircle,
  ImagePlus,
  Sparkles,
  Grid2X2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Kling AI style navigation - flat structure
const toolsNav = [
  { href: "/image", label: "Text to Image", icon: ImageIcon, description: "Generate images from text" },
  { href: "/image-to-image", label: "Image to Image", icon: ImagePlus, description: "Transform images" },
  { href: "/video", label: "Text to Video", icon: Video, description: "Generate videos from text" },
  { href: "/video-from-image", label: "Image to Video", icon: Video, description: "Animate images" },
  { href: "/upscale", label: "Upscale", icon: ArrowUpCircle, description: "Enhance resolution" },
  { href: "/enhancer", label: "Enhance", icon: Wand2, description: "Improve quality" },
  { href: "/logo", label: "Logo Creator", icon: Hexagon, description: "Design logos" },
  { href: "/effects", label: "AI Effects", icon: Sparkles, description: "Apply AI effects" },
  { href: "/background-removal", label: "Background Removal", icon: Eraser, description: "Remove backgrounds" },
  { href: "/gallery", label: "Gallery", icon: Grid2X2, description: "View generations" },
  { href: "/settings", label: "Settings", icon: Settings, description: "App settings" },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border/50 bg-[#0a0a0a] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo/Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-6 border-b border-border/50",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        {!collapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Krya
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {toolsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                  "hover:bg-white/5",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-white border-l-2 border-blue-500"
                    : "text-gray-400 hover:text-white",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "h-5 w-5 relative z-10 transition-colors",
                    isActive ? "text-blue-400" : ""
                  )}
                />
                {!collapsed && (
                  <div className="flex flex-col relative z-10">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-gray-500 font-normal">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
