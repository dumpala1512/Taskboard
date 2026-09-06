# =============================================================================
# Multi-Stage Production & Development Dockerfile for Next.js (TaskBoard)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install libc6-compat for Alpine compatibility with certain native dependencies
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Disable Husky git hook setup inside Docker builds
ENV HUSKY=0
# Disable Next.js telemetry in containers
ENV NEXT_TELEMETRY_DISABLED=1

# -----------------------------------------------------------------------------
# Stage 2: Dependencies Cache
# -----------------------------------------------------------------------------
FROM base AS deps

# Copy dependency manifests
COPY package.json package-lock.json ./

# Clean install all dependencies (including devDependencies for building)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 3: Development Target (Hot-reloading with host volumes)
# -----------------------------------------------------------------------------
FROM base AS dev

WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3000

# Copy cached dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# Next.js dev server bound to 0.0.0.0 for container networking
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

# -----------------------------------------------------------------------------
# Stage 4: Production Builder
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

# Build the Next.js production bundle
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 5: Production Runner (Lean, Secure Non-Root Container)
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application and required assets with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/server ./server

# Ensure writable permissions for local JSON database directory
RUN mkdir -p /app/server/database && chown -R nextjs:nodejs /app/server/database

USER nextjs

EXPOSE 3000

# Health check to ensure application is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/csrf || exit 1

# Start production server bound to all network interfaces
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
