/**
 * Socket Event Emitter
 *
 * Singleton that holds the Socket.IO server instance.
 * Workers import this to push real-time events to connected clients.
 */

import type { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Emit a job event to a specific user's room
 */
export function emitToUser(userId: string, event: string, data: Record<string, unknown>) {
  const io = getSocketIO();
  if (!io) return;

  io.of("/notifications").to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Emit job completion event
 */
export function emitJobComplete(userId: string, data: {
  type: "image" | "video" | "enhancement" | "training" | "logo" | "style-transfer" | "background-removal";
  jobId?: string;
  generationId?: string;
  videoId?: string;
  modelId?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: "completed" | "failed";
  error?: string;
  title: string;
  message: string;
}) {
  emitToUser(userId, "job:update", data);
}
