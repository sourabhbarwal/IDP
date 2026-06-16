# Roadmap & Phase Checkpoints

Each phase below ends with a **Checkpoint**: concrete, runnable verification steps that
must pass before moving to the next phase. Phases map directly to the development strategy
in the master specification.

## Phase 0 — Repository & Architecture Foundation ✅
- [x] Monorepo scaffold (`frontend/`, `backend/*`, `infrastructure/`, `monitoring/`,
      `ai-copilot/`, `templates/`, `docs/`, `tests/`, `.github/`)
- [x] `.gitignore` (excludes process docs, build artifacts, secrets)
- [x] ADR-0001 (monorepo structure & namespace strategy)
- [x] ADR-0002 (service decomposition / DDD bounded contexts)
- [x] Architecture overview with C4 diagrams

**Checkpoint**: Repo pushed to GitHub, structure matches this document, ADRs reviewed.

## Phase 1 — Authentication, RBAC, PostgreSQL
- [ ] `@idp/common` shared npm package (error format, audit contract, JWT helpers, OTel bootstrap)
- [ ] `auth-service` NestJS skeleton (Clean Architecture layout per ADR-0004)
- [ ] PostgreSQL `auth` schema: `users`, `roles`, `permissions`, `user_roles`,
      `role_permissions`, `refresh_tokens`, `audit_logs` (TypeORM migrations)
- [ ] Endpoints: register, login, logout, refresh token, get current user
- [ ] JWT issuance + validation (passport-jwt), refresh token rotation
- [ ] RBAC: 5 roles + permission model, Roles/Permissions guards
- [ ] Audit logging hook (local AuditPublisher impl, swappable later)
- [ ] Tests: unit (Jest) + integration (Testcontainers Postgres), coverage ≥ 80%
- [ ] OpenAPI spec via @nestjs/swagger
- [ ] Dockerfile (non-root, multi-stage) + docker-compose (postgres + redis + auth-service)
- [ ] GitHub Actions: lint → unit test → integration test → build → docker build
- [ ] Basic frontend: login/register pages (placeholder UI)

**Checkpoint**:
1. `docker compose up` brings up Postgres, Redis, auth-service
2. `POST /api/v1/auth/register` creates a user
3. `POST /api/v1/auth/login` returns access + refresh JWT
4. `GET /api/v1/users/me` with bearer token returns user + roles
5. `POST /api/v1/auth/refresh` rotates tokens
6. `npm run test:cov` passes with ≥80% coverage
7. CI pipeline green on PR

## Phase 2 — Service Catalog
- [ ] `service-catalog-service`: CRUD for services, versions, ownership, search
- [ ] Schema: `services`, `service_versions`
- [ ] Frontend: Service Catalog pages (list, create, detail, edit)
- [ ] RBAC enforcement on catalog endpoints

**Checkpoint**: Create/search/view/edit/delete a service via API and UI; deployment history
placeholder visible.

## Phase 3 — GitHub Integration
- [ ] `repository-service`: GitHub App/OAuth integration
- [ ] Auto-create repo, branch protection, README, CODEOWNERS, issue/PR templates, CI workflow

**Checkpoint**: Creating a service via UI provisions a real GitHub repository with the
expected files and protections.

## Phase 4 — Template Engine
- [ ] `template-service`: Spring Boot, Node.js, FastAPI, Go templates
- [ ] Each template includes Dockerfile, README, GitHub Actions, k8s manifests, health
      endpoints, monitoring/logging/security config

**Checkpoint**: Generate a project for each of the 4 stacks; generated project builds and
passes its own CI.

## Phase 5 — Docker Integration
- [ ] Dockerfiles for all 11 backend services + frontend (non-root, read-only FS, multi-stage)
- [ ] Image scanning in CI (Trivy/Grype)
- [ ] ECR push pipeline

**Checkpoint**: All images build, scan clean (or with documented exceptions), push to ECR.

## Phase 6 — Kubernetes Deployments
- [ ] Helm charts per service (Deployment, Service, Ingress, ConfigMap, Secret, HPA)
- [ ] `deployment-service`: deploy/rollback/promote, rolling/blue-green/canary strategies
- [ ] Namespace automation (`<env>-<service>`)
- [ ] Terraform: EKS cluster + supporting AWS resources

**Checkpoint**: Deploy `auth-service` to `dev-auth-service` namespace via the platform UI;
rollback works; promotion to staging works.

## Phase 7 — Monitoring & Logging
- [ ] Prometheus + Grafana + Loki + OpenTelemetry deployed via Helm
- [ ] `monitoring-service` and `logging-service` query APIs
- [ ] Dashboards: service health, latency, error rate, resource usage

**Checkpoint**: Dashboards show live metrics/logs for `auth-service`; trace spans visible
end-to-end for a sample request.

## Phase 8 — Alerts
- [ ] AlertManager rules: high CPU/memory, pod crashes, deploy failures, error rate,
      latency, secret expiry
- [ ] `alert-service` + `notification-service`: Email, Slack, Discord, Webhook channels

**Checkpoint**: Triggering a synthetic high-error-rate condition fires an alert delivered
to a configured Slack webhook.

## Phase 9 — Cost Analytics
- [ ] `cost-service`: CPU/memory/storage/network cost tracking, reports, savings
      recommendations, waste/rightsizing detection

**Checkpoint**: Cost dashboard shows per-service cost breakdown and at least one
rightsizing recommendation for an intentionally oversized test workload.

## Phase 10 — Security Hardening
- [ ] HashiCorp Vault integration (production secrets), Kubernetes Secrets (dev)
- [ ] TLS 1.3, security headers, rate limiting, input validation audit
- [ ] Container hardening (non-root, read-only FS) verified across all services
- [ ] Security scanning gates in CI (SAST, dependency scanning, image scanning)

**Checkpoint**: OWASP ZAP baseline scan passes against staging; Vault-backed secret
rotation demonstrated; CI fails on injected critical vulnerability (negative test).

## Phase 11 — AI Copilot
- [ ] `ai-copilot` service: Chat Assistant, Incident Investigator, Cost Advisor,
      Documentation Assistant, Security Advisor

**Checkpoint**: Ask "why is my service failing?" for a deliberately broken sample
deployment; Copilot returns root cause + confidence + recommended fix sourced from real
logs/metrics/traces.

---

## Cross-Cutting (continuous, not a single phase)
- Test coverage gates (backend ≥80%, frontend ≥70%) enforced in CI from Phase 1 onward
- OpenAPI docs published per service from Phase 1 onward
- Observability hooks (OTel) added to every service as it's created, not retrofitted
- Audit logging hooks added to every state-changing endpoint from Phase 1 onward
