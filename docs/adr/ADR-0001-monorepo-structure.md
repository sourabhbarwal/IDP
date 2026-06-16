# ADR-0001: Monorepo Structure & Repository Layout

## Status
Accepted

## Date
2026-06-11

## Context
The IDP platform consists of a React frontend, 11 NestJS/TypeScript microservices, an AI Copilot
layer, infrastructure-as-code (Terraform/Helm/Kubernetes), monitoring configuration, project
generator templates, and test suites (unit, integration, E2E, load).

We need to decide how to organize this code: as a monorepo (single repository) or as
multiple polyrepos (one repository per service/component).

## Decision
We will use a **monorepo** structure named `idp-platform`, organized as:

```
idp-platform/
├── frontend/
├── backend/<service-name>/   (11 independently buildable NestJS services)
├── infrastructure/{terraform,helm,kubernetes}
├── monitoring/{prometheus,grafana,loki,alertmanager,otel}
├── ai-copilot/
├── templates/{spring-boot,nodejs,fastapi,go}
├── docs/{adr,architecture,api,runbooks}
├── tests/{e2e,load}
└── .github/workflows/
```

Each backend service under `backend/` is an independent npm workspace package with its own
Dockerfile, OpenAPI spec, and test suite, but shares common parent POM configuration and
common libraries where appropriate (e.g. shared DTOs, security config, observability
bootstrap).

## Rationale
- **Atomic cross-cutting changes**: A single PR can update a shared contract (e.g. an event
  schema) and all consuming services simultaneously.
- **Unified CI/CD**: GitHub Actions can use path-based filters to build/test/deploy only the
  changed services, while still allowing platform-wide checks (security scanning, E2E tests).
- **Single source of truth for IaC**: Terraform/Helm changes are reviewed alongside the
  application code that depends on them.
- **Easier onboarding**: New developers clone one repository to get the full picture of the
  platform.
- **Consistency**: Shared linting, formatting, and architectural conventions are enforced
  centrally.

### Trade-offs accepted
- Repository size will grow significantly over time — mitigated via `.gitignore` for build
  artifacts, Git LFS consideration for large binary assets if needed later, and shallow
  clones in CI.
- CI pipeline complexity increases — mitigated via path-filtering and matrix builds per
  service (see ADR-0003, CI/CD pipeline design, to be added in Phase 1).
- Independent service deployability must be preserved despite shared repo — each service
  retains its own Helm chart values and its own GitHub Actions job, so a change to one
  service does not force redeployment of others.

## Namespace Strategy (Kubernetes)
Per the architecture spec, Kubernetes namespaces follow the pattern:

```
<environment>-<service-name>
```

Examples: `dev-auth-service`, `staging-deployment-service`, `prod-cost-service`.

Environments: `development`, `testing`, `staging`, `production` (shortened to `dev`,
`test`, `staging`, `prod` in namespace names for brevity and Kubernetes naming limits).

## Internal Process Documents
`TASKS.md` and `PROGRESS.md` are working documents used during development to track phase
completion and are excluded from the repository via `.gitignore` (per project convention).
Architecture decisions that need to persist as part of the product's documentation live in
`docs/adr/` and `docs/architecture/` and ARE committed.

## Consequences
- All future ADRs live in `docs/adr/` using sequential numbering (ADR-0002, ADR-0003, ...).
- Each backend service module must include a minimal `README.md` describing its bounded
  context, API surface, and local run instructions (added as each service is implemented).
