# IDP Platform — Enterprise AI-Native Internal Developer Platform

A fully-featured Internal Developer Platform built with NestJS microservices,
React frontend, PostgreSQL, and a complete observability stack.

## Architecture

11 microservices + React frontend running via Docker Compose.

| Service | Port | Responsibility |
|---|---|---|
| auth-service | 3001 | JWT/RBAC authentication |
| service-catalog-service | 3002 | Service registry |
| repository-service | 3003 | GitHub repo provisioning |
| template-service | 3004 | Project template generation |
| deployment-service | 3005 | Rolling/blue-green/canary deployments |
| monitoring-service | 3006 | Prometheus metrics proxy |
| logging-service | 3007 | Loki log query proxy |
| alert-service | 3008 | Alert rules + AlertManager |
| notification-service | 3009 | Slack/Email/Webhook delivery |
| audit-service | 3010 | Cross-service audit trail |
| cost-service | 3011 | Resource cost analytics |
| frontend | 5173 | React dashboard |

## Observability Stack
| Tool | Port | Purpose |
|---|---|---|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards (admin / <see docker-compose.yml GF_SECURITY_ADMIN_PASSWORD>) |
| Loki | 3100 | Log aggregation |
| AlertManager | 9093 | Alert routing |

## Quick Start

```bash
# Prerequisites: Docker Desktop, Node.js 20
git clone https://github.com/sourabhbarwal/IDP.git
cd IDP

# Start full platform (13 containers)
docker compose up -d

# Check all services are healthy
docker compose ps

# Open the portal
open http://localhost:5173

# Default credentials (development only)
# email: dev@example.com
# password: S3cure!Passw0rd
```

## Docker Images (GHCR)

All images are published to GitHub Container Registry on every push to `main`.

```bash
# Pull all images (replace <owner> with your GitHub username)
docker pull ghcr.io/<owner>/idp-auth-service:latest
docker pull ghcr.io/<owner>/idp-service-catalog-service:latest
# ... etc

# Or use docker-compose.prod.yml for the full stack:
export REGISTRY=ghcr.io/<owner>
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

| Service | Image |
|---|---|
| auth-service | `ghcr.io/<owner>/idp-auth-service:latest` |
| service-catalog-service | `ghcr.io/<owner>/idp-service-catalog-service:latest` |
| ... | ... |

## Development

```bash
cd backend
npm install
npm run build --workspace=common

# Run a specific service locally (outside docker)
cd auth-service
npm run start:dev
```

## Tech Stack
- **Backend:** NestJS v10, TypeScript, TypeORM, PostgreSQL
- **Frontend:** React, TypeScript, Tailwind CSS, Redux Toolkit
- **Observability:** Prometheus, Grafana, Loki, AlertManager, OTel Collector
- **CI:** GitHub Actions (lint, test, build, Trivy scan, CodeQL, Gitleaks)
- **Local Runtime:** Docker Compose
- **Production Target:** kind + Helm (see infrastructure/)

## ADR Index
- ADR-0001: Monorepo structure
- ADR-0002: DDD bounded contexts
- ADR-0003: JWT auth strategy
- ADR-0004: NestJS/TypeScript backend
- ADR-0005: GitHub integration
- ADR-0006: Container security hardening
- ADR-0007: Local-first deployment
- ADR-0008: Kubernetes deployment strategy
- ADR-0009: Observability stack
- ADR-0010: Local runtime — Docker Compose
- ADR-0011: Cost analytics strategy
- ADR-0012: Security hardening