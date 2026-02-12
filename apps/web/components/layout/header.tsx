"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  User,
  Check,
  Image as ImageIcon,
  Video,
  Wand2,
  GraduationCap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { useUser } from "@/hooks/use-api";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, typeof ImageIcon> = {
  generation_complete: ImageIcon,
  video_complete: Video,
  enhancement_complete: Wand2,
  training_complete: GraduationCap,
};

export function Header() {
  const pathname = usePathname();
  const { data: user } = useUser();
  const userId = user?.id;
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotifications({ userId });
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId, fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || segments[0] === "dashboard") return "Dashboard";
    return segments[0]
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-border/40 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-300">{getPageTitle()}</h2>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:bg-white/10 transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 text-[10px] font-medium text-gray-500">
              /
            </kbd>
          </button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <Bell className="h-4 w-4 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-[#141414] shadow-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAsRead()}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => {
                        const Icon = typeIcons[n.type] || Bell;
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-border/50 last:border-0",
                              !n.read && "bg-blue-500/5"
                            )}
                            onClick={() => {
                              if (!n.read) markAsRead(n.id);
                            }}
                          >
                            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-gray-500 truncate">{n.message}</p>
                              {n.timestamp && (
                                <p className="text-[10px] text-gray-600 mt-1">
                                  {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            {!n.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Avatar */}
          <Link
            href="/settings"
            className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <User className="h-4 w-4 text-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}
