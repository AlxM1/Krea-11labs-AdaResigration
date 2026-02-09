# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /app

# Copy workspace config and package files
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies (hoisted node-linker for standalone compatibility)
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public dir exists
RUN mkdir -p apps/web/public

# Generate Prisma client (generates into node_modules/@prisma/client)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate

# Build the application
RUN pnpm --filter @krya/web build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build (includes apps/web structure)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy static assets to the correct location
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma
# Copy Prisma generated client and all Prisma runtime dependencies
RUN mkdir -p ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/client-runtime-utils ./node_modules/@prisma/client-runtime-utils
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/@prisma/engines-version ./node_modules/@prisma/engines-version
COPY --from=builder /app/node_modules/@prisma/debug ./node_modules/@prisma/debug

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

# Next.js HTTP server
EXPOSE 3000
# Socket.IO server for real-time canvas
EXPOSE 3001

ENV PORT=3000
ENV WS_PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV UPLOAD_DIR="/app/uploads"

CMD ["node", "server.js"]
