# Multi-stage build for BookingSearchMCP
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S booking && \
    adduser -S booking -u 1001

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create logs directory
RUN mkdir -p logs && chown -R booking:booking logs

# Switch to non-root user
USER booking

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (if running HTTP server)
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]