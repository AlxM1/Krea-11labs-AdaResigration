# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat vips-dev
RUN corepack enable pnpm
WORKDIR /app

# Copy workspace config and package files
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies (hoisted node-linker for standalone compatibility)
RUN pnpm install

# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache vips-dev
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
RUN apk add --no-cache vips fontconfig ttf-dejavu
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build (includes apps/web structure)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy static assets to the correct location (root level for standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
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

# Install sharp with all dependencies directly in runner (standalone + pnpm doesn't copy transitive deps)
RUN cd /tmp && npm init -y && npm install sharp@0.33.2 && cp -r node_modules/sharp /app/node_modules/sharp && cp -r node_modules/@img /app/node_modules/@img && cp -r node_modules/detect-libc /app/node_modules/detect-libc && cp -r node_modules/color /app/node_modules/color 2>/dev/null; cp -r node_modules/semver /app/node_modules/semver 2>/dev/null; cp -r node_modules/color-string /app/node_modules/color-string 2>/dev/null; cp -r node_modules/color-name /app/node_modules/color-name 2>/dev/null; cp -r node_modules/color-convert /app/node_modules/color-convert 2>/dev/null; cp -r node_modules/simple-swizzle /app/node_modules/simple-swizzle 2>/dev/null; cp -r node_modules/is-arrayish /app/node_modules/is-arrayish 2>/dev/null; rm -rf /tmp/node_modules /tmp/package.json /tmp/package-lock.json

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
