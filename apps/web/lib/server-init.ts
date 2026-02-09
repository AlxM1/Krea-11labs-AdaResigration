/**
 * Server initialization — Node.js runtime only
 *
 * This module is dynamically imported from instrumentation.ts
 * only when NEXT_RUNTIME === "nodejs", keeping it out of edge bundles.
 */

import { Server as SocketIOServer } from "socket.io";
import { encode, decode } from "@msgpack/msgpack";
import { initializeWorkers } from "./queue/workers";
import {
  getRealtimePipeline,
  handleWebSocketMessage,
} from "./realtime/server";

export async function startServices() {
  // Start BullMQ workers
  try {
    initializeWorkers();
    console.log("[Instrumentation] BullMQ workers started");
  } catch (error) {
    console.warn("[Instrumentation] Failed to start BullMQ workers:", error);
  }

  // Start Socket.IO server
  try {
    await startSocketIOServer();
  } catch (error) {
    console.warn("[Instrumentation] Failed to start Socket.IO server:", error);
  }
}

async function startSocketIOServer() {
  const wsPort = parseInt(process.env.WS_PORT || "3001", 10);

  const io = new SocketIOServer(wsPort, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  const pipeline = getRealtimePipeline();
  await pipeline.initialize();

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    console.log(`[Socket.IO] Client connected from ${clientIp}`);

    const session = pipeline.createSession("anonymous", {
      prompt: "",
      strength: 0.5,
      guidance: 7.5,
      model: "lcm-sd15",
      width: 512,
      height: 512,
    });

    // Send connected message
    socket.emit("connected", {
      sessionId: session.id,
      timestamp: Date.now(),
    });

    socket.on("frame", async (data: { image: ArrayBuffer; prompt?: string; strength?: number; seed?: number; model?: string }) => {
      try {
        // Update settings if provided
        if (data.prompt !== undefined || data.strength !== undefined || data.seed !== undefined || data.model !== undefined) {
          pipeline.updateSettings(session.id, {
            prompt: data.prompt ?? session.settings.prompt,
            strength: data.strength ?? session.settings.strength,
            seed: data.seed,
            model: data.model ?? session.settings.model,
          });
        }

        await handleWebSocketMessage(
          session.id,
          { type: "frame", data: data.image },
          (msg) => {
            if (msg.type === "output" && msg.frame) {
              socket.emit("generated", {
                frame: msg.frame,
                latency: msg.latency,
                timestamp: msg.timestamp,
              });
            } else if (msg.type === "error") {
              socket.emit("error", { message: msg.message, timestamp: msg.timestamp });
            }
          }
        );
      } catch (error) {
        console.error("[Socket.IO] Frame handling error:", error);
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        });
      }
    });

    socket.on("settings", (settings: { prompt?: string; strength?: number; seed?: number; model?: string }) => {
      pipeline.updateSettings(session.id, settings);
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    socket.on("disconnect", () => {
      pipeline.closeSession(session.id);
      console.log(`[Socket.IO] Session ${session.id} closed`);
    });
  });

  console.log(`[Socket.IO] Server ready on port ${wsPort}`);

  // Graceful shutdown
  const shutdown = () => {
    io.close();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
