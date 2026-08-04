FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/tsconfig.base.json ./
COPY backend/common/package.json ./common/
COPY backend/realtime-service/package.json ./realtime-service/
RUN npm install --workspaces --include-workspace-root
COPY backend/common ./common
COPY backend/realtime-service ./realtime-service
RUN npm run build --workspace=common
RUN npm run build --workspace=realtime-service
RUN npm prune --omit=dev --workspaces

FROM node:20-alpine AS production
ARG BUILD_REVISION=unknown
LABEL org.opencontainers.image.title="IDP Platform - Realtime Service" \
      org.opencontainers.image.description="WebSocket gateway for real-time notifications" \
      org.opencontainers.image.revision="${BUILD_REVISION}"
RUN addgroup -S idp && adduser -S idp -G idp
WORKDIR /app
COPY --from=builder --chown=idp:idp /app/node_modules ./node_modules
COPY --from=builder --chown=idp:idp /app/common/dist ./common/dist
COPY --from=builder --chown=idp:idp /app/common/package.json ./common/package.json
COPY --from=builder --chown=idp:idp /app/realtime-service/dist ./realtime-service/dist
COPY --from=builder --chown=idp:idp /app/realtime-service/package.json ./realtime-service/package.json
USER idp
EXPOSE 3013
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3013/health || exit 1
WORKDIR /app/realtime-service
CMD ["node", "dist/main.js"]