/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize:
 * - BullMQ workers for background job processing
 * - Socket.IO server for real-time canvas features
 *
 * The actual server code lives in lib/server-init.ts and is
 * dynamically imported only for the Node.js runtime, keeping
 * it out of the Edge bundle (which can't resolve fs, path, etc).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServices } = await import("./lib/server-init");
    await startServices();
  }
}
