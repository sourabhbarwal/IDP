# ADR-0002: Service Decomposition & Bounded Contexts

## Status
Accepted

## Date
2026-06-11

## Context
The platform must support 11 backend microservices. To follow Domain-Driven Design (DDD)
and Clean Architecture, each service must own a clearly defined bounded context, its own
database schema (or schemas), and communicate with other services through well-defined
contracts rather than shared database access.

## Decision

### Bounded Contexts → Services

| Service | Bounded Context | Owns (DB tables) |
|---|---|---|
| `auth-service` | Identity & Access Management | `users`, `roles`, `permissions`, `user_roles`, `refresh_tokens` |
| `service-catalog-service` | Service Catalog | `services`, `service_versions` |
| `repository-service` | Source Code Provisioning | `repositories` |
| `template-service` | Project Template Generation | (stateless / template definitions in `templates/`) |
| `deployment-service` | Deployment Orchestration | `deployments`, `environments` |
| `monitoring-service` | Metrics aggregation & query | (reads from Prometheus; minimal local cache) |
| `logging-service` | Log aggregation & query | (reads from Loki; minimal local cache) |
| `alert-service` | Alerting rules & evaluation | `alerts` |
| `notification-service` | Notification delivery | `notifications` |
| `audit-service` | Audit trail | `audit_logs` |
| `cost-service` | Cloud cost analytics | `cost_reports` |

### Internal Architecture per Service
> **Note**: Backend implementation language/framework changed from Spring Boot to
> NestJS/TypeScript — see ADR-0004. The layering principles below are unchanged; only
> the folder/package layout syntax differs.

Every NestJS service follows **Clean Architecture / Hexagonal Architecture** layering:

```
<service>/src/
├── domain/             # Entities, value objects, domain services (no framework deps)
├── application/         # Use cases, ports (interfaces/DI tokens)
├── infrastructure/      # Adapters: TypeORM repositories, controllers, guards, config
│   ├── persistence/
│   ├── web/             # Controllers, DTOs, OpenAPI decorators
│   ├── security/
│   └── audit/
└── <service>.module.ts
```

### Communication Strategy
- **Synchronous (REST + OpenAPI)**: Used for request/response operations the user is
  waiting on (e.g., frontend → service-catalog-service → repository-service to provision a
  repo). All inter-service REST calls go through internal Kubernetes Service DNS, secured
  with mTLS-ready configuration (production hardening in Phase 10).
- **Asynchronous (events)**: Used for cross-cutting concerns that should not block the
  primary flow — e.g., `deployment-service` emits a `DeploymentCompleted` event consumed by
  `audit-service` (audit log) and `notification-service` (notify owners). Initial
  implementation uses Redis Streams (already in stack) for lightweight eventing; a
  dedicated message broker (e.g., Kafka/RabbitMQ) is deferred and will be revisited in an
  ADR if throughput requirements demand it.
- **Database-per-service**: Each service owns its schema within the shared PostgreSQL
  instance (logical separation via schemas: `auth`, `catalog`, `repository`, `deployment`,
  `alert`, `notification`, `audit`, `cost`). No service queries another service's tables
  directly.

### Cross-Cutting Concerns (Shared Library)
A shared package `@idp/common` (npm workspace package at `backend/common/`) provides:
- Standard error response format (RFC 7807 Problem Details) + global exception filter
- JWT validation guard base (resource-server side)
- Audit event publishing port (`AuditPublisher`) and `AuditEvent` contract
- OpenTelemetry bootstrap helper
- Common pagination/filtering DTOs (`PageResponse`)

## Rationale
- Database-per-service-schema (rather than fully separate databases) balances operational
  simplicity (one RDS instance to manage in MVP) with logical isolation. Migration to
  separate databases per service is straightforward later since no cross-schema queries are
  permitted by convention.
- REST + OpenAPI keeps the system approachable and testable; async eventing is introduced
  only where it provides clear decoupling value (audit, notifications), avoiding premature
  complexity.

## Consequences
- Each service gets its own TypeORM migration set scoped to its schema.
- `audit-service` and `notification-service` must be designed as consumers from day one
  (Phase 1 includes the audit event contract even though full audit UI lands later).
- A shared `@idp/common` package will be versioned and consumed via npm workspaces by all
  services.
