# syntax=docker/dockerfile:1.5

# Multi-stage build for Node.js API server and Next.js Web app
# Using slim image to avoid Alpine/musl compatibility issues with native modules
FROM node:20-slim AS base

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for workspace installation
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/demo-ui/package.json ./apps/demo-ui/

# Install dependencies (including devDependencies for build)
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Express API
RUN npm run build

# Build Next.js App
# Note: We don't need to run npm install again because we have workspaces
WORKDIR /app/apps/web
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m nodejs

# Create uploads and logs directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Copy built Express API
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src/scripts ./src/scripts
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Install production dependencies for Express API (root)
# We need to be careful here. Since we are in a workspace, npm ci might try to install everything.
# But we only need root dependencies for the API.
# A better approach for the API might be to bundle it or just copy node_modules if size permits.
# However, to keep image small, we'll try to install only prod deps.
# Copying package-lock.json is important.
COPY --from=builder --chown=nodejs:nodejs /app/package-lock.json ./package-lock.json
# We also need the workspace definitions to avoid errors, even if we don't install their deps?
# Actually, if we run npm ci --omit=dev in root, it might try to install workspace deps too.
# Let's just copy the node_modules from builder and prune them?
# Pruning is tricky with workspaces.
# Let's try running npm ci --omit=dev --workspace=root (if that's a thing) or just npm ci --omit=dev
# If we copy the workspace package.jsons, npm ci will install their prod deps too.
# But for standalone Next.js, we don't need web deps in root node_modules.
# So, let's ONLY copy root package.json and lockfile, and NOT apps/web/package.json?
# If we do that, npm might complain about missing workspace members.
# Alternative: Copy node_modules from builder and run npm prune --production.
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
# RUN npm prune --production # This might be slow or problematic with workspaces.
# Let's stick to copying node_modules for now to ensure it works, optimization can be done if size is still huge.

# Copy Next.js Standalone build
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Copy start script
COPY --from=builder --chown=nodejs:nodejs /app/scripts/start-prod.sh ./scripts/start-prod.sh
RUN chmod +x ./scripts/start-prod.sh

USER nodejs

EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]

CMD ["./scripts/start-prod.sh"]
