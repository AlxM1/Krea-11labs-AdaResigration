"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  PanelLeftClose,
  PanelLeft,
  Bell,
  User,
  Search,
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

const navSections: NavSection[] = [
  {
    title: "Create",
    items: [
      { href: "/image", label: "AI Images", icon: ImageIcon },
      { href: "/image-to-image", label: "Image to Image", icon: ImagePlus },
      { href: "/video", label: "AI Videos", icon: Video },
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
      { href: "/lipsync", label: "Lip Sync", icon: Mic },
      { href: "/motion-transfer", label: "Motion Transfer", icon: PersonStanding },
      { href: "/video-restyle", label: "Video Restyle", icon: Film },
      { href: "/effects", label: "AI Effects", icon: Sparkles },
    ],
  },
  {
    title: "Library",
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

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-[#1f1f1f] transition-all duration-200 shrink-0 h-screen sticky top-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-between px-4 h-14 border-b border-[#1f1f1f] shrink-0",
        collapsed && "px-2 justify-center"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 btn-gradient">
            <span className="text-white font-bold text-base">K</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold gradient-text">
              Krya
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-[#555] hover:text-white hover:bg-white/5 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-[#1f1f1f]">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-[#555] hover:text-white hover:bg-white/5 transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && "mt-2")}>
            {!collapsed && (
              <div className="px-3 mb-1.5 mt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[#555]">
                  {section.title}
                </span>
              </div>
            )}
            {collapsed && sectionIdx > 0 && (
              <div className="mx-2 my-2 border-t border-[#1f1f1f]" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                        style={{ background: "#6c5ce7" }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-white" : ""
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

      {/* Bottom — Settings + User */}
      <div className="border-t border-[#1f1f1f] p-2 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
            pathname === "/settings"
              ? "bg-[#1a1a1a] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
