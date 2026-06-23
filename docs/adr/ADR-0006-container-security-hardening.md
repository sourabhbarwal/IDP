# ADR-0006: Container Security Hardening Standards

## Status
Accepted

## Date
2026-06-22

## Context
All 11 backend microservices and the React frontend must be containerised for
deployment to EKS. We need consistent, auditable container security standards
across the platform.

## Decision

### Base Images
| Service type | Builder | Production |
|---|---|---|
| NestJS (Node.js) | `node:20-alpine` | `node:20-alpine` (non-root) |
| React frontend | `node:20-alpine` | `nginx:1.27-alpine` |

Alpine is chosen for minimal attack surface. We avoid `latest` tags in production;
all images are pinned to a specific minor version and updated via Dependabot.

### Multi-Stage Builds
Every Dockerfile uses at minimum two stages:
1. **builder** — installs devDependencies, compiles TypeScript, prunes to production deps
2. **production** — copies only compiled output and production node_modules

### Non-Root User
Every production image creates and switches to a dedicated non-root user:
```dockerfile
RUN addgroup -S idp && adduser -S idp -G idp
USER idp
```
Kubernetes PodSecurityContext additionally enforces `runAsNonRoot: true`.

### Read-Only Root Filesystem
All images are designed to work with `readOnlyRootFilesystem: true` in K8s.
Any writable paths needed at runtime (tmp, logs) are mounted as `emptyDir`
or `tmpfs` volumes in the Pod spec.

### OCI Image Labels
Every Dockerfile includes standard OCI annotation labels for traceability: