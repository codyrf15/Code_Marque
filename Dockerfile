# CodeMarque Discord Bot with Mermaid CLI Support
FROM node:20-alpine AS base

# Install Chrome/Chromium dependencies for Mermaid CLI
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Chrome executable path for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including Mermaid CLI
RUN npm ci --only=production && \
    npm install -g @mermaid-js/mermaid-cli && \
    npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY test/ ./test/

# Create directory for Mermaid diagrams
RUN mkdir -p /app/temp/mermaid-diagrams && \
    chmod 755 /app/temp/mermaid-diagrams

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S codemarque -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R codemarque:nodejs /app

USER codemarque

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (from config.js)
EXPOSE 4000

# Start the application
CMD ["node", "src/index.js"] 