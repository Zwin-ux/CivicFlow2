# syntax=docker/dockerfile:1.5

# Multi-stage build for Node.js API server and Next.js Web app
# Using slim image to avoid Alpine/musl compatibility issues with native modules
FROM node:20-slim AS builder

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
# Increase memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
# Install root dependencies
RUN npm ci --prefer-offline

# Install web dependencies explicitly
WORKDIR /app/apps/web
RUN npm ci --prefer-offline

# Return to root
WORKDIR /app

# Copy source code
COPY . .

# Build Express API
RUN npm run build

# Build Next.js App
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM node:20-slim

# Install dumb-init for proper signal handling
# Debian/Ubuntu uses apt-get
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/web/package*.json ./apps/web/

# Install production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Install web production dependencies
WORKDIR /app/apps/web
RUN npm ci --omit=dev && \
    npm cache clean --force

# Return to root
WORKDIR /app

# Copy built Express API
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src/scripts ./src/scripts

# Copy built Next.js App
# Note: Even with standalone enabled, we copy the standard build output for now to ensure compatibility
# with existing start scripts. If we want to use standalone fully, we'd need to adjust start-prod.sh
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/next.config.ts ./apps/web/

# Copy public folder (Express)
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Copy start script
COPY --from=builder --chown=nodejs:nodejs /app/scripts/start-prod.sh ./scripts/start-prod.sh
RUN chmod +x ./scripts/start-prod.sh

# Create uploads and logs directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose ports (3000 for Web, 3001 for API)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start both applications
CMD ["./scripts/start-prod.sh"]
