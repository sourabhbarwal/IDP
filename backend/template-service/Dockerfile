FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/tsconfig.base.json ./
COPY backend/common/package.json ./common/
COPY backend/template-service/package.json ./template-service/
RUN npm install --workspaces --include-workspace-root
COPY backend/common ./common
COPY backend/template-service ./template-service
RUN npm run build --workspace=common
RUN npm run build --workspace=template-service
RUN npm prune --omit=dev --workspaces

FROM node:20-alpine AS production
RUN addgroup -S idp && adduser -S idp -G idp
WORKDIR /app
COPY --from=builder --chown=idp:idp /app/node_modules ./node_modules
COPY --from=builder --chown=idp:idp /app/common/dist ./common/dist
COPY --from=builder --chown=idp:idp /app/common/package.json ./common/package.json
COPY --from=builder --chown=idp:idp /app/template-service/dist ./template-service/dist
COPY --from=builder --chown=idp:idp /app/template-service/package.json ./template-service/package.json
USER idp
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3004/health || exit 1
WORKDIR /app/template-service
CMD ["node", "dist/main.js"]