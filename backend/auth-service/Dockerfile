# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY backend/package.json backend/tsconfig.base.json ./
COPY backend/common/package.json ./common/
COPY backend/auth-service/package.json ./auth-service/

# Install all deps (including devDependencies needed for TypeScript compilation)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY backend/common ./common
COPY backend/auth-service ./auth-service

# Build shared library first, then the service
RUN npm run build --workspace=common
RUN npm run build --workspace=auth-service

# Prune devDependencies for the production image
RUN npm prune --omit=dev --workspaces

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S idp && adduser -S idp -G idp

WORKDIR /app

# Copy only the compiled output and production node_modules
COPY --from=builder --chown=idp:idp /app/node_modules ./node_modules
COPY --from=builder --chown=idp:idp /app/common/dist ./common/dist
COPY --from=builder --chown=idp:idp /app/common/package.json ./common/package.json
COPY --from=builder --chown=idp:idp /app/auth-service/dist ./auth-service/dist
COPY --from=builder --chown=idp:idp /app/auth-service/package.json ./auth-service/package.json

USER idp

# Kubernetes liveness/readiness probe port
EXPOSE 3001

# Health check (Kubernetes probes take precedence; this is a fallback for docker run)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

WORKDIR /app/auth-service

CMD ["node", "dist/main.js"]
