FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/tsconfig.base.json ./
COPY backend/common/package.json ./common/
COPY backend/logging-service/package.json ./logging-service/
RUN npm install --workspaces --include-workspace-root
COPY backend/common ./common
COPY backend/logging-service ./logging-service
RUN npm run build --workspace=common
RUN npm run build --workspace=logging-service
RUN npm prune --omit=dev --workspaces

FROM node:20-alpine AS production
ARG BUILD_REVISION=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="IDP Platform - logging Service" \
      org.opencontainers.image.vendor="IDP Platform" \
      org.opencontainers.image.revision="${BUILD_REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}"
RUN addgroup -S idp && adduser -S idp -G idp
WORKDIR /app
COPY --from=builder --chown=idp:idp /app/node_modules ./node_modules
COPY --from=builder --chown=idp:idp /app/common/dist ./common/dist
COPY --from=builder --chown=idp:idp /app/common/package.json ./common/package.json
COPY --from=builder --chown=idp:idp /app/logging-service/dist ./logging-service/dist
COPY --from=builder --chown=idp:idp /app/logging-service/package.json ./logging-service/package.json
USER idp
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3007/health || exit 1
WORKDIR /app/logging-service
CMD ["node", "dist/main.js"]