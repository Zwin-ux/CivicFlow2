# syntax=docker/dockerfile:1.5

# Multi-stage build for Node.js API server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PROGRESS=false

# Copy package files
# Copying package files first so we can install dependencies in the builder
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for the build)
# Skip Chromium download during install to keep builder fast; visual tests can
# install Chromium locally when needed. This is safe because Chromium is not
# required for the production image.
RUN --mount=type=cache,target=/root/.npm \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm ci --prefer-offline && \
    npm cache clean --force

# Copy source code
# Copy remaining source code
COPY . .

# Install frontend dependencies (Next.js) so `next` is available under apps/web
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --prefix apps/web

# Build TypeScript
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

# Copy package files (use the builder's package-lock.json so `npm ci` can run reproducibly)
COPY --from=builder /app/package*.json ./

# Install production dependencies only (omit dev dependencies)
# Using `npm ci --omit=dev` here will use the lockfile produced in the builder stage.
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# Ensure compiled scripts (migrations/seeds) are available in the final image
COPY --from=builder --chown=nodejs:nodejs /app/dist/scripts ./dist/scripts

# Copy public folder (HTML, CSS, JS, images)
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Copy migration and seed scripts
COPY --from=builder --chown=nodejs:nodejs /app/src/database ./src/database
COPY --from=builder --chown=nodejs:nodejs /app/src/scripts ./src/scripts

# Create uploads and logs directories for local storage
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check - use the actual health route exposed by the app
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
