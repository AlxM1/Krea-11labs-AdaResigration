"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Box,
  Zap,
  Layers,
  Wand2,
  Scissors,
  Mic,
  Move,
  Palette,
  GraduationCap,
  Home,
  Clock,
  Star,
  FolderOpen,
  Eraser,
  Hexagon,
  Blend,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: Clock },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/projects", label: "Projects", icon: FolderOpen },
];

const generateNav = [
  { href: "/image", label: "Image", icon: ImageIcon },
  { href: "/video", label: "Video", icon: Video },
  { href: "/realtime", label: "Real-time", icon: Zap },
  { href: "/3d", label: "3D", icon: Box },
  { href: "/nodes", label: "Nodes", icon: Layers },
];

const toolsNav = [
  { href: "/enhancer", label: "Enhancer", icon: Wand2 },
  { href: "/editor", label: "Editor", icon: Scissors },
  { href: "/background-removal", label: "BG Removal", icon: Eraser },
  { href: "/logo", label: "Logo", icon: Hexagon },
  { href: "/style-transfer", label: "Style", icon: Blend },
  { href: "/lipsync", label: "Lipsync", icon: Mic },
  { href: "/motion-transfer", label: "Motion", icon: Move },
  { href: "/video-restyle", label: "Restyle", icon: Palette },
  { href: "/train", label: "Train", icon: GraduationCap },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const NavSection = ({
    title,
    items,
  }: {
    title: string;
    items: typeof mainNav;
  }) => (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-muted",
                isActive ? "text-primary" : "text-muted-foreground",
                collapsed && "justify-center"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: "spring", duration: 0.3 }}
                />
              )}
              <item.icon className={cn("h-5 w-5 relative z-10", isActive && "text-primary")} />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card/50 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <NavSection title="Main" items={mainNav} />
        <NavSection title="Generate" items={generateNav} />
        <NavSection title="Tools" items={toolsNav} />
      </div>
    </aside>
  );
}
