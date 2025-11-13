# Multi-stage build for Node.js API server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

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

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
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
