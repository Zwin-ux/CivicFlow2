# syntax=docker/dockerfile:1.5

# Multi-stage build for Node.js API server and Next.js Web app
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PROGRESS=false

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
# We need to install dependencies for both root and apps/web
RUN --mount=type=cache,id=cache-npm-packages,target=/root/.npm \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm ci --prefer-offline && \
    npm cache clean --force

# Copy source code
COPY . .

# Build Express API
RUN npm run build

# Build Next.js App
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/web/package*.json ./apps/web/

# Install production dependencies
RUN --mount=type=cache,id=cache-npm-packages,target=/root/.npm npm ci --omit=dev && \
    npm cache clean --force

# Copy built Express API
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src/scripts ./src/scripts

# Copy built Next.js App
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
