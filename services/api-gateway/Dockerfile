# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install pnpm globally (mirrors workspace toolchain)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN pnpm run build

# Prune dev dependencies so the runtime stage stays lean
RUN pnpm prune --prod

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what's needed at runtime
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json

USER appuser

EXPOSE 4000

ENV NODE_ENV=production \
    PORT=4000

CMD ["node", "dist/index.js"]
