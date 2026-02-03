import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latency?: number; error?: string };
    memory: { status: "ok" | "warning"; used: number; total: number };
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    memory: { status: "ok", used: 0, total: 0 },
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  checks.memory = {
    status: usedMB / totalMB > 0.9 ? "warning" : "ok",
    used: usedMB,
    total: totalMB,
  };

  // Determine overall status
  let status: HealthStatus["status"] = "healthy";
  if (checks.database.status === "down") {
    status = "unhealthy";
  } else if (checks.memory.status === "warning") {
    status = "degraded";
  }

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  // Return 503 for unhealthy status (for load balancers)
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: httpStatus });
}

// Lightweight liveness probe (just checks if app is running)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
