/**
 * Prisma Database Client
 * Configured with connection pooling and proper error handling
 */

import { PrismaClient, Prisma } from "@prisma/client";

// Extend the global object type
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma logging based on environment
const logConfig: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];

// Create Prisma client with optimized settings
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: logConfig.map((level) => ({
      emit: "event" as const,
      level,
    })),
    // Connection pool settings are configured via DATABASE_URL
    // Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
  });
}

// Singleton pattern for Prisma Client
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Set up logging event handlers
if (process.env.NODE_ENV === "development") {
  // Log queries in development
  prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
    console.log(`[Prisma Query] ${e.query}`);
    console.log(`[Prisma Params] ${e.params}`);
    console.log(`[Prisma Duration] ${e.duration}ms`);
  });
}

// Always log errors
prisma.$on("error" as never, (e: Prisma.LogEvent) => {
  console.error(`[Prisma Error] ${e.message}`);
});

prisma.$on("warn" as never, (e: Prisma.LogEvent) => {
  console.warn(`[Prisma Warning] ${e.message}`);
});

// Store the client in global for hot reloading in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from the database
 * Call this when shutting down the application
 */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Check database connectivity
 * Returns true if connected, false otherwise
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[Database] Connection check failed:", error);
    return false;
  }
}

/**
 * Execute a transaction with automatic retry on deadlock
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a retryable error (deadlock, connection timeout)
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2024"].includes(error.code);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt - 1))
      );

      console.warn(
        `[Database] Retrying operation (attempt ${attempt + 1}/${maxRetries})`
      );
    }
  }

  throw lastError;
}

export default prisma;
