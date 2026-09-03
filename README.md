# IDP Platform — Enterprise AI-Native Internal Developer Platform

<div align="center">

[![CI — auth-service](https://github.com/sourabhbarwal/IDP/actions/workflows/auth-service-ci.yml/badge.svg)](https://github.com/sourabhbarwal/IDP/actions)
[![CI — catalog-service](https://github.com/sourabhbarwal/IDP/actions/workflows/service-catalog-ci.yml/badge.svg)](https://github.com/sourabhbarwal/IDP/actions)
[![CD Pipeline](https://github.com/sourabhbarwal/IDP/actions/workflows/cd-pipeline.yml/badge.svg)](https://github.com/sourabhbarwal/IDP/actions/workflows/cd-pipeline.yml)
[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker%20Compose-20%2B%20containers-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/license-MIT-22C55E)](LICENSE)

**A production-grade Internal Developer Platform built from scratch — 14 NestJS microservices, a React dashboard, complete observability stack, AI Copilot powered by LLaMA 3, and DORA metrics. Runs on a single `docker compose up -d`.**

[Quick Start](#quick-start) · [Architecture](#architecture) · [Services](#services) · [AI Copilot](#ai-copilot) · [Observability](#observability) · [DORA Metrics](#dora-metrics) · [Kubernetes](#kubernetes-deployment)

</div>

---

## What is this?

An **Internal Developer Platform (IDP)** is a self-service layer that abstracts infrastructure complexity away from developers. Instead of every engineer needing to know Kubernetes, Terraform, Prometheus, and a dozen other tools, they interact with one unified portal.

This platform lets a developer:

- 📋 **Register** their microservice in a central catalog with dependency mapping
- 🏗️ **Scaffold** a production-ready project from templates (Node.js, FastAPI, Go, Spring Boot) — pre-configured with CI/CD, Dockerfile, and metrics endpoint
- 🚀 **Deploy** using rolling, blue-green, or canary strategy via a single API call
- 📊 **Monitor** real-time metrics, logs, and distributed traces from one dashboard
- 🚨 **Receive alerts** on Slack, Email, or Webhook the instant something fires
- 🤖 **Ask the AI Copilot** to investigate incidents, optimise costs, or recommend deployment strategies — using live platform data injected as context
- 📈 **Track DORA metrics** (Deployment Frequency, Lead Time, CFR, MTTR) — the 4 engineering performance metrics used by Google, Spotify, and Netflix

---

## Quick Start

```bash
# Prerequisites: Docker Desktop (6GB+ RAM), Node.js 20+, Git

# 1. Clone
git clone https://github.com/sourabhbarwal/IDP.git
cd IDP

# 2. (Optional) Add your free Groq API key for real AI responses
# Get one at: https://console.groq.com — no credit card required
echo "GROQ_API_KEY=gsk_your_key_here" > .env

# 3. Start the entire platform (22 containers)
docker compose up -d

# 4. Wait ~60 seconds for all services to initialise
docker compose ps   # All should show "healthy"

# 5. Open the platform
open http://localhost:5173

# Default credentials
# Email:    dev@example.com
# Password: S3cure!Passw0rd
```

**Everything that starts:**

| Service | Port | What it does |
|---|---|---|
| **Frontend** | 5173 | React dashboard |
| **Nginx Gateway** | 80 | Single API entry point |
| **auth-service** | 3001 | JWT auth, RBAC |
| **service-catalog-service** | 3002 | Service registry |
| **repository-service** | 3003 | GitHub provisioning |
| **template-service** | 3004 | Project generators |
| **deployment-service** | 3005 | K8s deployments |
| **monitoring-service** | 3006 | Prometheus proxy |
| **logging-service** | 3007 | Loki proxy |
| **alert-service** | 3008 | Alert rules + webhooks |
| **notification-service** | 3009 | Slack / Email / Webhook |
| **audit-service** | 3010 | Cross-service audit trail |
| **cost-service** | 3011 | Resource cost analytics |
| **ai-copilot-service** | 3012 | Groq LLaMA 3 AI |
| **realtime-service** | 3013 | WebSocket notifications |
| **dora-service** | 3014 | DORA metrics |
| **Prometheus** | 9090 | Metrics collection |
| **Grafana** | 3000 | Dashboards (admin / idp-admin-password) |
| **Loki** | 3100 | Log aggregation |
| **Grafana Tempo** | 3200 | Distributed traces |
| **AlertManager** | 9093 | Alert routing |
| **cAdvisor** | 8080 | Real container metrics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer Browser                           │
│                  React SPA (Tailwind, Redux, Socket.io)             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Nginx API Gateway (port 80)                      │
│       Rate limiting · Path routing · Security headers               │
│       X-Frame-Options · HSTS · X-Content-Type-Options               │
└────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
     │      │      │      │      │      │      │      │      │
     ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
  auth   catalog  repo  template deploy  mon   log   alert  copilot
  :3001  :3002  :3003   :3004  :3005  :3006 :3007  :3008   :3012
     │      │      │      │      │      │      │      │      │
     └──────┴──────┴──┬───┴──────┴──────┴──────┴──────┴──────┘
                      │  All services connect through PgBouncer
                      ▼
          ┌─────────────────────┐     ┌──────────┐     ┌─────────┐
          │  PgBouncer (:6432)  │────▶│PostgreSQL│     │  Redis  │
          │  transaction pool   │     │  16 (:5432)    │  :6379  │
          │  20 server conns    │     │  6 schemas│     │         │
          └─────────────────────┘     └──────────┘     └─────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Observability Stack                            │
│                                                                     │
│  Prometheus ──▶ Grafana     Loki ◀── Promtail (Docker socket)      │
│  AlertManager ──▶ Notification-service                             │
│  OTel Collector ──▶ Grafana Tempo  (distributed traces)            │
│  cAdvisor ──▶ Prometheus  (real container CPU/memory)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Design principles

| Principle | Implementation |
|---|---|
| **Domain-Driven Design** | Every service has `domain/` (entities, ports) → `application/` (use cases) → `infrastructure/` (adapters) |
| **Shared nothing** | Services communicate via HTTP only. Each owns its PostgreSQL schema. |
| **Stateless services** | All state in PostgreSQL + Redis. Kill any service, restart it, zero data loss. |
| **Defence in depth** | Nginx rate limiting + NestJS throttler + Helmet headers + JWT auth on every endpoint |
| **Observable by default** | Every service exposes `/metrics` (Prometheus), logs to stdout (JSON), and emits OTel traces |

---

## Services

### 1. Auth Service — `auth-service:3001`
JWT-based authentication with role-based access control.

- **5 roles:** `ADMIN`, `DEVELOPER`, `OPERATOR`, `VIEWER`, `SERVICE_ACCOUNT`
- **16 permissions:** `service:create`, `service:read`, `deployment:create`, `deployment:rollback`, `alert:manage`, and more
- Refresh token rotation (15-min access / 7-day refresh) stored in Redis
- Rate limited: 10 login attempts per 15 minutes per IP
- JWT RS256 upgrade path — auth-service holds the private key, all other services verify with public key only
- `@SkipThrottle()` on `GET /auth/me` — never 429s on authenticated reads

### 2. Service Catalog — `service-catalog-service:3002`
Central registry for all platform services. Phase 20 added:

- **Dependency graph** — HARD / SOFT / ASYNC edges between services, circular dependency detection
- **Health score** — 0-100 composite (alert count + deployment failure rate), four levels: HEALTHY / DEGRADED / WARNING / CRITICAL
- **Onboarding checklist** — 6 items per service (repo, CI, metrics endpoint, alert rules, deployment, deps declared)
- Full-text search, pagination, soft delete, duplicate name detection (409)

### 3. Repository Service — `repository-service:3003`
GitHub repository provisioning via Personal Access Token.

- Auto-provisions repos with pre-configured CI/CD workflow, Dockerfile, README
- Links repository to catalog entry for automatic pipeline wiring

### 4. Template Service — `template-service:3004`
Stateless ZIP project generator. Four templates:

| Template | What's included |
|---|---|
| **Node.js / NestJS** | TypeScript, Dockerfile, GitHub Actions CI, `/metrics`, `/health`, Jest |
| **Python / FastAPI** | Uvicorn, Prometheus client, Docker, pytest |
| **Go** | Gin, Prometheus, multi-stage Dockerfile, Go test |
| **Spring Boot** | Maven, Actuator, Spring Security, Docker |

### 5. Deployment Service — `deployment-service:3005`
Three-strategy deployment engine backed by Kubernetes.

| Strategy | Best for | Rollback |
|---|---|---|
| **Rolling** | Stable services, zero downtime | ~2 minutes |
| **Blue-Green** | Major changes, critical services | Instant |
| **Canary** | High-traffic, gradual validation | ~1 minute |

- 4-environment promotion chain: `dev → test → staging → prod`
- Full deployment history in PostgreSQL
- **Dev mode** (`K8S_SKIP_TLS_VERIFY=true`): simulates 2-5s deployments locally without a real K8s cluster — DORA metrics show real data

### 6. Monitoring Service — `monitoring-service:3006`
Prometheus query proxy — frontend never needs to know PromQL.

- Per-service: request rate, error rate, p95 latency
- Range queries for time-series charts
- Backed by cAdvisor for real container CPU/memory (not just process estimates)

### 7. Logging Service — `logging-service:3007`
Loki log query proxy — uses correct Docker Compose labels (`service`, `compose_project`).

- Full-text search across all service logs
- Level filtering (info, warn, error)
- Time range queries
- Promtail uses `docker_sd_configs` with Docker socket — all IDP containers auto-discovered

### 8. Alert Service — `alert-service:3008`
Alert rule management and AlertManager webhook receiver.

- CRUD for Prometheus alerting rules
- AlertManager webhook receiver — receives fired alerts, persists to PostgreSQL
- Alert acknowledgement workflow
- Publishes every received alert to `realtime-service` for instant browser notification

### 9. Notification Service — `notification-service:3009`
Multi-channel notification delivery.

- **Slack** — Block Kit formatted messages
- **Email** — HTML via SMTP (Nodemailer)
- **Webhook** — generic HTTP POST
- Graceful degradation — one channel failing doesn't block others

### 10. Audit Service — `audit-service:3010`
Unified, cross-service audit trail using raw SQL `UNION ALL`.

- Reads `audit_logs` from every service schema — no data duplication
- Filter by: action, resource type, result, source schema, time range
- Action summary grouped by service and action type

### 11. Cost Service — `cost-service:3011`
Real container resource cost analytics.

- Queries **real cAdvisor metrics** via Prometheus:
  - `container_cpu_usage_seconds_total` → actual CPU cores
  - `container_memory_working_set_bytes` → what OOM killer sees
- Pricing: AWS t3.medium equivalent ($0.048/vCPU-hour, $0.006/GB-hour)
- Rightsizing: OPTIMAL / OVERSIZED / IDLE classification with specific recommendations

### 12. AI Copilot Service — `ai-copilot-service:3012`
The flagship feature. See [AI Copilot](#ai-copilot) below.

### 13. Realtime Service — `realtime-service:3013`
Socket.io WebSocket gateway for live push notifications.

- JWT authenticated WebSocket connections
- Room-based routing: `alerts`, `deployments`, `audit`, `user:{userId}`
- Critical alerts broadcast to ALL connected clients
- Internal webhook endpoint for other services to publish events
- Frontend notification center: bell icon, unread count, dropdown, browser OS notifications

### 14. DORA Service — `dora-service:3014`
Four key DevOps Research and Assessment metrics.

- Raw SQL across `deployment.deployments` + `alert.alert_events`
- Configurable time window (7d / 14d / 30d / 90d)
- Classifies: **Elite** / **High** / **Medium** / **Low** per Google 2023 report

---

## AI Copilot

The AI Copilot is not a generic chatbot. Every mode **fetches live platform data** before asking the LLM, so answers are specific to your platform's actual state.

### Modes

| Mode | Live Data | What it does |
|---|---|---|
| 💬 **Platform Chat** | None | General Q&A about the IDP platform |
| 🔍 **Incident Investigator** | Active alerts + service metrics | Identifies the most critical issue, correlates alerts with metrics, gives NestJS/Postgres/Docker-specific remediation steps |
| 💰 **Cost Advisor** | Cost summary + per-service breakdown | Top 3 cost reduction opportunities with specific dollar amounts |
| 🚀 **Deployment Advisor** | Live metrics for the named service | Recommends strategy + gives the exact API call to trigger it |

### How streaming works

```
Frontend                  Backend                   Groq API
   │                         │                          │
   │──POST /chat/stream──────▶│                          │
   │                         │──fetch live data─────────▶│
   │                         │◀──alerts/metrics/costs────│
   │◀──SSE: context event────│                          │
   │                         │──POST stream:true─────────▶│
   │◀──SSE: delta "Hello"────│◀───── chunk "Hello" ──────│
   │◀──SSE: delta " world"───│◀───── chunk " world" ─────│
   │◀──SSE: done (stats)─────│◀───── [DONE] ─────────────│
```

- Server-Sent Events over HTTP POST (not EventSource — needs auth headers)
- AbortController stop button cancels mid-stream
- Mock streaming when no API key set — words appear at realistic pace
- Persistent per-mode history in `localStorage`, survives page refresh and mode switches
- Token usage progress bar in sidebar, warning at 3,000+ tokens

### Get a free Groq API key

1. Go to [console.groq.com](https://console.groq.com) — no credit card required
2. Create an API key
3. Add `GROQ_API_KEY=gsk_your_key_here` to your `.env` file
4. `docker compose restart ai-copilot-service`

---

## Observability

### Metrics pipeline
```
NestJS /metrics (every service) ──▶ Prometheus (scrapes every 15s)
cAdvisor (real container metrics) ──▶ Prometheus ──▶ Grafana dashboards
```

### Logs pipeline
```
Container stdout (structured JSON) ──▶ Promtail (Docker socket discovery)
                                   ──▶ Loki ──▶ Grafana Explore
```

Promtail uses `docker_sd_configs` — zero config, all IDP containers auto-discovered via `compose_project=idp` label.

### Traces pipeline
```
NestJS (OTel auto-instrumentation) ──▶ OTel Collector ──▶ Grafana Tempo
HTTP requests + PostgreSQL queries + Redis ops — all traced automatically
```

Log-to-trace correlation: TraceIDs appear in log lines → click → jump to trace waterfall in Grafana.

### Grafana dashboards

| Dashboard | What it shows |
|---|---|
| **Services Overview** | Request rate, error rate, p95 latency per service |
| **SLO Dashboard** | Availability % gauge (99.9% target), error budget remaining, real container CPU/memory from cAdvisor |

Open Grafana: [http://localhost:3000](http://localhost:3000) — `admin` / `idp-admin-password`

### Loki alerting rules (log-pattern based)

| Alert | Condition | Severity |
|---|---|---|
| `HighLogErrorRate` | >10 error lines in 5 minutes | Warning |
| `CriticalLogErrorRate` | >50 error lines in 5 minutes | Critical |
| `FatalErrorInLogs` | Any PANIC/FATAL anywhere | Critical |
| `HighAuthFailureRate` | >20 invalid credential attempts in 5 minutes | Warning |

---

## Security

| Layer | What's implemented |
|---|---|
| **HTTP headers** | Helmet on all 14 services: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy |
| **Rate limiting** | Nginx (10 req/s burst 20 on auth, 100 req/s burst 50 on API) + NestJS throttler |
| **Authentication** | JWT HS256 (dev) / RS256 (prod) — auth-service signs with private key, others verify only |
| **Input validation** | `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` |
| **Container security** | Non-root users, multi-stage builds, no dev deps in prod images |
| **CI scanning** | Trivy (image CVEs), Gitleaks (secrets in git history), npm audit (critical prod deps) |
| **Connection pooling** | PgBouncer — prevents connection exhaustion, services never connect directly to Postgres |

### Generate JWT RS256 keys (for production)

```powershell
# PowerShell (Windows)
.\scripts\generate-jwt-keys.ps1

# Bash (Linux/Mac/CI)
./scripts/generate-jwt-keys.sh
```

Set `JWT_ALGORITHM=RS256`, `JWT_PRIVATE_KEY_PATH=./secrets/jwt/private.pem` on auth-service only.
All other services use `JWT_PUBLIC_KEY_PATH=./secrets/jwt/public.pem` (verify only, cannot forge tokens).

---

## DORA Metrics

The DORA dashboard is at [http://localhost:5173/dora](http://localhost:5173/dora).

| Metric | What we measure | Data source |
|---|---|---|
| **Deployment Frequency** | Successful deployments / day | `deployment.deployments` |
| **Lead Time for Changes** | Avg deployment duration (start → complete) | `deployment.deployments` |
| **Change Failure Rate** | % of deployments that failed or were rolled back | `deployment.deployments` |
| **MTTR** | Avg time from alert fired → acknowledged/resolved | `alert.alert_events` |

### Classification thresholds (Google 2023)

| Level | Deploy Freq | Lead Time | CFR | MTTR |
|---|---|---|---|---|
| 🏆 **Elite** | >1/day | <1 hour | <5% | <1 hour |
| ✅ **High** | 1/week–1/day | <1 day | <10% | <1 day |
| ⚡ **Medium** | 1/month–1/week | <1 week | <15% | <1 week |
| ⚠️ **Low** | <1/month | >1 week | >15% | >1 week |

---

## Service Resilience

All inter-service HTTP calls use a three-layer resilience pattern from `@idp/common`:

```typescript
// Circuit breaker — after 5 failures, fail-fast for 30s
const cb = this.cbRegistry.getOrCreate('cost-service', 5, 30_000);

// Retry with exponential backoff — 100ms → 200ms → 400ms
// Circuit breaker — 3-state: CLOSED → OPEN → HALF_OPEN
const res = await resilientFetch(url, { headers }, { timeoutMs: 5_000, maxAttempts: 3, circuit: cb });
```

If `cost-service` is down, the AI Copilot COST mode still answers — it acknowledges no cost data is available and gives general advice. The platform never cascades.

Check circuit breaker states: `GET /api/v1/copilot/resilience`

---

## Frontend

### Pages

| Route | What's there |
|---|---|
| `/login` | JWT login with redirect |
| `/dashboard` | Platform overview, quick nav |
| `/catalog` | All services, search, pagination |
| `/catalog/new` | Register a new service |
| `/catalog/:id` | 3 tabs: Overview · Health+Checklist · Dependency Graph |
| `/templates` | Template gallery, ZIP download |
| `/monitoring` | Live metric grid + Loki log viewer |
| `/alerts` | Active alerts + rules management |
| `/cost` | Per-service cost table (real cAdvisor data) + audit trail |
| `/copilot` | AI Copilot — 4 modes, streaming, persistent history |
| `/dora` | DORA metrics dashboard |

### Key frontend patterns

- **Protected routes** — all pages wrapped in `<ProtectedRoute>`, redirect to login
- **JWT interceptor** — Axios attaches `Authorization: Bearer` to every request automatically
- **Auto 401 redirect** — expired tokens redirect to login without user action
- **Socket.io** — global WebSocket connection, notification bell on every page
- **react-markdown + remark-gfm** — AI responses render markdown tables, code blocks, lists
- **Tailwind Typography plugin** — prose styles for AI Copilot responses

---

## CI/CD Pipeline

### Per-service CI (16 workflows)

Every service has its own GitHub Actions workflow triggered only when that service's code changes. Pattern:

```
Push to main/develop
    │
    ▼
Lint (0 warnings) + Unit Tests (≥80% coverage)
    │ pass
    ▼
TypeScript Build (nest build → dist/)
    │ pass
    ▼
Docker Build (multi-stage, non-root)
    + Trivy CVE scan (fails on HIGH/CRITICAL)
    + npm audit --audit-level=critical
    │ pass
    ▼
GHCR Push (main branch only)
  ghcr.io/sourabhbarwal/idp-<service>:sha-<short>
  ghcr.io/sourabhbarwal/idp-<service>:latest
```

### CD Pipeline (`cd-pipeline.yml`)

Triggers on every push to `main`. Builds all 14 images **in parallel** using GitHub Actions matrix strategy.

```
Push to main
    │
    ▼
Run all unit tests (all 14 services in sequence)
    │ pass
    ▼
Matrix build — 14 images in parallel (~3 min vs ~40 min sequential)
    │ push to GHCR with sha-<short> + latest tags
    ▼
Deploy (SKIPPED until DEPLOY_ENABLED=true + server secrets set)
    │
    ▼
Smoke test (SKIPPED until deployment runs)
```

**GHCR Images** (pushed on every merge to main):

```bash
docker pull ghcr.io/sourabhbarwal/idp-auth-service:latest
docker pull ghcr.io/sourabhbarwal/idp-service-catalog-service:latest
docker pull ghcr.io/sourabhbarwal/idp-template-service:latest
docker pull ghcr.io/sourabhbarwal/idp-deployment-service:latest
docker pull ghcr.io/sourabhbarwal/idp-monitoring-service:latest
docker pull ghcr.io/sourabhbarwal/idp-logging-service:latest
docker pull ghcr.io/sourabhbarwal/idp-alert-service:latest
docker pull ghcr.io/sourabhbarwal/idp-notification-service:latest
docker pull ghcr.io/sourabhbarwal/idp-audit-service:latest
docker pull ghcr.io/sourabhbarwal/idp-cost-service:latest
docker pull ghcr.io/sourabhbarwal/idp-ai-copilot-service:latest
docker pull ghcr.io/sourabhbarwal/idp-realtime-service:latest
docker pull ghcr.io/sourabhbarwal/idp-dora-service:latest
docker pull ghcr.io/sourabhbarwal/idp-frontend:latest
```

### Release automation

```bash
# Create a release — automatically builds changelog + GHCR image table
git tag v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# GitHub Actions creates the release at: github.com/sourabhbarwal/IDP/releases
```

---

## Kubernetes Deployment

### Prerequisites
```bash
winget install Kubernetes.kubectl Kubernetes.kind Helm.Helm
```

### Local kind cluster

```bash
# Create cluster
kind create cluster --config infrastructure/kubernetes/kind-config.yaml --name idp-platform

# Install Nginx Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Apply all 14 service namespaces
kubectl apply -f infrastructure/kubernetes/namespaces.yaml

# Create GHCR pull secret (run in each namespace)
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=sourabhbarwal \
  --docker-password=$GITHUB_TOKEN \
  -n dev-auth-service
```

### Deploy all 14 services

```bash
IMAGE_TAG="latest"

for svc in auth-service service-catalog-service repository-service template-service \
           deployment-service monitoring-service logging-service alert-service \
           notification-service audit-service cost-service ai-copilot-service \
           realtime-service dora-service; do
  helm upgrade --install $svc infrastructure/helm/$svc \
    --namespace "dev-$svc" \
    --set image.tag=$IMAGE_TAG \
    --set secrets.JWT_SECRET=$JWT_SECRET \
    --set secrets.DB_PASSWORD=$DB_PASSWORD \
    --wait --timeout 120s
done
```

### Enable production deployment via CD pipeline

When a server is provisioned, set these GitHub secrets/variables and push to main:

```
DEPLOY_HOST         = your.server.ip
DEPLOY_USER         = ubuntu
DEPLOY_SSH_KEY      = <private key content>
DEPLOY_PATH         = /home/ubuntu/IDP
DEPLOY_URL          = http://your.server.ip
DEPLOY_ENABLED      = true   ← set this last
```

The `deploy` and `smoke-test` jobs activate automatically on the next push.

**Rollback to any previous version:**
```bash
export IMAGE_TAG=sha-<previous-short-sha>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build
```

---

## Project Structure

```
IDP/
├── backend/
│   ├── common/                     # @idp/common — shared library
│   │   └── src/
│   │       ├── filters/            # GlobalExceptionFilter
│   │       ├── security/           # applySecurity(), throttler configs
│   │       ├── resilience/         # CircuitBreaker, withRetry, resilientFetch
│   │       └── telemetry/          # initTracing() OpenTelemetry helper
│   ├── auth-service/               # Port 3001
│   ├── service-catalog-service/    # Port 3002
│   ├── repository-service/         # Port 3003
│   ├── template-service/           # Port 3004
│   ├── deployment-service/         # Port 3005
│   ├── monitoring-service/         # Port 3006
│   ├── logging-service/            # Port 3007
│   ├── alert-service/              # Port 3008
│   ├── notification-service/       # Port 3009
│   ├── audit-service/              # Port 3010
│   ├── cost-service/               # Port 3011
│   ├── ai-copilot-service/         # Port 3012
│   ├── realtime-service/           # Port 3013
│   └── dora-service/               # Port 3014
├── frontend/
│   └── src/
│       ├── pages/                  # One folder per route
│       ├── services/               # API clients per service
│       ├── hooks/                  # useCopilotHistory, useRealtimeNotifications
│       ├── components/             # DependencyGraph, ServiceHealthPanel, NotificationCenter
│       └── store/                  # Redux auth slice
├── monitoring/
│   ├── prometheus/                 # prometheus.yml + alert rules
│   ├── grafana/                    # Provisioned datasources + dashboards (Prometheus, Loki, Tempo)
│   ├── loki/                       # loki-config.yaml + promtail-config.yaml (docker_sd_configs)
│   ├── tempo/                      # tempo-config.yaml
│   ├── alertmanager/               # alertmanager.yml
│   └── otel/                       # otel-collector-config.yaml
├── nginx/
│   └── nginx.conf                  # API gateway with rate limiting zones
├── pgbouncer/
│   ├── pgbouncer.ini               # Transaction pool, 20 server conns, 200 client slots
│   └── userlist.txt
├── infrastructure/
│   ├── kubernetes/                 # kind-config.yaml + namespaces.yaml (14 namespaces)
│   └── helm/                       # 14 Helm charts, one per service
├── scripts/
│   ├── generate-jwt-keys.ps1       # RS256 key pair generation (PowerShell)
│   ├── generate-jwt-keys.sh        # RS256 key pair generation (Bash)
│   ├── setup-cd.ps1                # GitHub secrets setup helper
│   └── setup-server.sh             # Production server preparation
├── docs/
│   ├── adr/                        # 19 Architecture Decision Records
│   ├── architecture/               # platform-overview.svg
│   ├── kubernetes/                 # kind-setup.md
│   ├── api-routes.md               # Correct route reference for all services
│   └── technical-debt/             # NESTJS-V11-UPGRADE.md (status: resolved)
├── docker-compose.yml              # Local dev — 22 containers, build from source
├── docker-compose.prod.yml         # Production — pulls from GHCR
└── .github/
    └── workflows/                  # 16 CI/CD workflows
        ├── *-service-ci.yml        # 14 per-service CI workflows
        ├── cd-pipeline.yml         # Matrix build + push to GHCR + deploy
        ├── release.yml             # Semver tagging + GitHub Release
        └── swagger-validation.yml  # Swagger docs completeness check
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| NestJS | v11 | Microservice framework (DI, decorators, modules) |
| TypeScript | 5.5 | Full type safety across all 14 services |
| TypeORM | 0.3.x | ORM, code-first migrations, per-schema isolation |
| PostgreSQL | 16 | Shared database, 6 schemas |
| Redis | 7 | Refresh tokens, session caching |
| PgBouncer | 1.23 | Connection pooling (transaction mode) |
| Passport.js + JWT | — | HS256 dev / RS256 prod |
| @nestjs/throttler | v6 | Rate limiting |
| @nestjs/websockets | v11 | Socket.io WebSocket gateway |
| Helmet | v8 | HTTP security headers |
| class-validator | — | Input validation with whitelist |
| OpenTelemetry | 0.53 | Auto-instrumentation (HTTP, Postgres, Redis) |
| Groq SDK | — | LLaMA 3 70B inference |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript 5.5 | Type safety |
| Tailwind CSS 3 | Utility-first styling |
| @tailwindcss/typography | Prose styles for AI markdown |
| Redux Toolkit | Auth state |
| React Router v6 | Protected routes |
| Axios | HTTP client with JWT interceptor |
| Socket.io-client | WebSocket notifications |
| react-markdown + remark-gfm | Markdown + GFM tables in AI Copilot |
| Vite | Build tooling |

### Observability
| Technology | Purpose |
|---|---|
| Prometheus | Metrics + alerting rule evaluation |
| Grafana | Dashboards (Services Overview, SLO) |
| Loki | Log aggregation |
| Promtail | Log shipping (Docker socket discovery) |
| Grafana Tempo | Distributed trace backend |
| OpenTelemetry Collector | Trace pipeline (batching, enrichment) |
| AlertManager | Alert routing (Slack, Email, Webhook) |
| cAdvisor | Real container CPU/memory/network metrics |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | Local development runtime |
| Nginx | API gateway, rate limiting |
| kind + Helm | Kubernetes local cluster + production |
| GitHub Actions | CI/CD (16 workflows) |
| GHCR | Container image registry (free) |
| Trivy | Container image CVE scanning |
| Gitleaks | Secrets detection in git history |

---

## Architecture Decision Records

19 ADRs document every significant technical decision:

| ADR | Decision |
|---|---|
| 0001 | npm workspaces monorepo |
| 0002 | DDD + Clean Architecture per service |
| 0003 | JWT HS256 (dev) / RS256 (prod) |
| 0004 | NestJS v11 + TypeScript |
| 0005 | GitHub PAT for repo provisioning (OAuth app = production path) |
| 0006 | Non-root containers, multi-stage Docker builds |
| 0007 | Local-first ($0/month) — full platform on Docker Desktop |
| 0008 | kind + Helm for production Kubernetes target |
| 0009 | LGTM observability stack (Loki, Grafana, Tempo, Mimir) |
| 0010 | Docker Compose as canonical local runtime |
| 0011 | cAdvisor for real container metrics (not process estimates) |
| 0012 | Helmet + throttler + SAST + image scanning + secrets detection |
| 0013 | Nginx gateway + PgBouncer (prevents connection exhaustion) |
| 0014 | OTel auto-instrumentation + Tempo (zero-code tracing) |
| 0015 | Socket.io WebSocket gateway (dedicated realtime-service) |
| 0016 | GHCR CD pipeline (matrix builds, SSH deploy, semver tagging) |
| 0017 | Three-layer resilience (timeout + retry + circuit breaker) |
| 0018 | DORA metrics (raw SQL across schemas, no new tables) |
| 0019 | Service catalog enhancement (dependency graph, health score, checklist) |

---

## Known Limitations

| Limitation | Root Cause | Status |
|---|---|---|
| `/repositories/by-service/:id` returns 404 for services with no provisioned repo | Expected — no repo was provisioned | Not a bug |
| Cost service shows 0 if cAdvisor hasn't scraped yet | cAdvisor needs ~30s after startup | Wait and refresh |
| Loki returns empty if Promtail hasn't ingested | Promtail needs ~60s after startup | Wait and refresh |
| Deployment-service DORA shows LOW without traffic | No real deployments without K8s | Use dev mode (`K8S_SKIP_TLS_VERIFY=true`) to simulate |

---

## Development

### Local development (outside Docker)

```bash
cd backend
npm install

# Build shared library first
npm run build --workspace=common

# Start a service in watch mode
cd auth-service
cp .env.example .env
npm run start:dev
```

### Running tests

```bash
cd backend

# Single service
npm run test:cov --workspace=auth-service

# All services
for svc in common auth-service service-catalog-service template-service \
           deployment-service alert-service audit-service cost-service \
           ai-copilot-service realtime-service dora-service; do
  npm run test:cov --workspace=$svc
done
```

### Running migrations

```bash
# TypeORM migrations run automatically on service startup
# To run manually for a service that has a database:
cd backend/auth-service
npm run migration:run
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for real AI responses (free at console.groq.com)
GROQ_API_KEY=gsk_your_key_here

# Optional — GitHub repo provisioning
GITHUB_TOKEN=ghp_your_pat_here

# Optional — Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional — Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
```

---

## API Documentation

Every service exposes Swagger UI (development mode only):

| Service | Swagger URL |
|---|---|
| auth-service | http://localhost:3001/api/docs |
| service-catalog-service | http://localhost:3002/api/docs |
| repository-service | http://localhost:3003/api/docs |
| template-service | http://localhost:3004/api/docs |
| deployment-service | http://localhost:3005/api/docs |
| monitoring-service | http://localhost:3006/api/docs |
| logging-service | http://localhost:3007/api/docs |
| alert-service | http://localhost:3008/api/docs |
| notification-service | http://localhost:3009/api/docs |
| audit-service | http://localhost:3010/api/docs |
| cost-service | http://localhost:3011/api/docs |
| ai-copilot-service | http://localhost:3012/api/docs |
| realtime-service | http://localhost:3013/api/docs |
| dora-service | http://localhost:3014/api/docs |

Correct route reference: see [`docs/api-routes.md`](docs/api-routes.md)

---

## Platform Numbers

| Metric | Value |
|---|---|
| NestJS microservices | 14 |
| Frontend pages | 11 |
| GitHub Actions workflows | 16 |
| Docker containers (full stack) | 22+ |
| PostgreSQL schemas | 6 |
| JWT roles | 5 |
| JWT permissions | 16 |
| Deployment strategies | 3 |
| AI Copilot modes | 4 |
| Observability tools | 8 |
| DORA metrics tracked | 4 |
| Helm charts | 14 |
| Architecture Decision Records | 19 |
| Test coverage threshold | ≥80% |
| Phases to build | 21 |

---

## Author

**Sourabh Barwal** — B.Tech Computer Science, IIIT Nagpur (2023–2027)

- GitHub: [@sourabhbarwal17](https://github.com/sourabhbarwal17)
- LinkedIn: [Sourabh Barwal](https://linkedin.com/in/sourabhbarwal)
- Email: sourabh17barwal@gmail.com

---

## License

MIT — see [LICENSE](LICENSE)