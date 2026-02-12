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
  Palette,
  Mic,
  PersonStanding,
  Film,
  Zap,
  Box,
  Layers,
  FolderOpen,
  Heart,
  Clock,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Kling AI style navigation - categorized sections
const navSections: NavSection[] = [
  {
    title: "Create",
    items: [
      { href: "/image", label: "Text to Image", icon: ImageIcon },
      { href: "/image-to-image", label: "Image to Image", icon: ImagePlus },
      { href: "/video", label: "Text to Video", icon: Video },
      { href: "/video-from-image", label: "Image to Video", icon: Film },
      { href: "/3d", label: "3D Generation", icon: Box },
      { href: "/realtime", label: "Real-time Canvas", icon: Zap },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/upscale", label: "Upscale", icon: ArrowUpCircle },
      { href: "/enhancer", label: "Enhance", icon: Wand2 },
      { href: "/logo", label: "Logo Creator", icon: Hexagon },
      { href: "/patterns", label: "Patterns", icon: Sparkles },
      { href: "/background-removal", label: "Background Removal", icon: Eraser },
      { href: "/style-transfer", label: "Style Transfer", icon: Palette },
      { href: "/lipsync", label: "Lipsync", icon: Mic },
      { href: "/motion-transfer", label: "Motion Transfer", icon: PersonStanding },
      { href: "/video-restyle", label: "Video Restyle", icon: Film },
      { href: "/effects", label: "AI Effects", icon: Sparkles },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/gallery", label: "Gallery", icon: Grid2X2 },
      { href: "/history", label: "History", icon: Clock },
      { href: "/favorites", label: "Favorites", icon: Heart },
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/nodes", label: "Workflows", icon: Layers },
      { href: "/train", label: "Train Model", icon: GraduationCap },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border/50 bg-[#0a0a0a] transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo/Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-border/50",
        collapsed && "justify-center px-2"
      )}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Krya
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                      "hover:bg-white/5",
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-gray-400 hover:text-gray-200",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-blue-400" : ""
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom - Settings */}
      <div className="border-t border-border/50 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
            "hover:bg-white/5",
            pathname === "/settings"
              ? "bg-white/[0.08] text-white"
              : "text-gray-400 hover:text-gray-200",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
