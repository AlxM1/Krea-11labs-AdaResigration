"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  read: boolean;
}

interface JobUpdate {
  type: string;
  status: "completed" | "failed";
  generationId?: string;
  videoId?: string;
  modelId?: string;
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
  title: string;
  message: string;
  timestamp: number;
}

interface UseNotificationsOptions {
  userId?: string;
  onJobUpdate?: (update: JobUpdate) => void;
}

export function useNotifications({ userId, onJobUpdate }: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3001/notifications`
      : "";

    if (!wsUrl) return;

    const socket = io(wsUrl, {
      query: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Real-time job updates (image/video/enhancement completion)
    socket.on("job:update", (data: JobUpdate) => {
      if (data.status === "completed") {
        toast.success(data.message, { duration: 5000 });
      } else if (data.status === "failed") {
        toast.error(data.message, { duration: 8000 });
      }

      onJobUpdate?.(data);
    });

    // Database notification created
    socket.on("notification", (data: Notification) => {
      setNotifications((prev) => [{ ...data, read: false }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, onJobUpdate]);

  // Fetch existing notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const markAsRead = useCallback(async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAllRead: true }),
      });

      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    fetchNotifications,
    markAsRead,
  };
}
