# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml* ./

# Install ALL dependencies (including devDeps needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN pnpm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Non-root user for security
RUN addgroup -S vyne && adduser -S vyne -G vyne

# Install pnpm (needed to install prod deps only)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy SQL migrations so they can be mounted or run at startup if needed
COPY src/db/migrations ./migrations

# Set ownership
RUN chown -R vyne:vyne /app

USER vyne

# Expose HTTP + Socket.io port
EXPOSE 5003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5003/health || exit 1

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
