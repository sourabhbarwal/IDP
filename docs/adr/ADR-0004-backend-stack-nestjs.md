# ADR-0004: Backend Stack Change — Spring Boot/Java → NestJS/TypeScript

## Status
Accepted (supersedes backend technology choice in ADR-0002 where it conflicts)

## Date
2026-06-12

## Context
The original specification mandated Java 21 + Spring Boot for all 11 backend
microservices. After Phase 0 (architecture/scaffold) and the start of Phase 1
(`auth-service`), the project owner clarified they do not know Java and are actively
learning backend development — continuing in Spring Boot would make the codebase
unmaintainable/un-learnable for them, which conflicts with the practical goal of this
being *their* project to understand, run, and extend.

## Decision
Replace the backend stack with **NestJS + TypeScript**, keeping every other architectural
decision from ADR-0001/0002/0003 intact (Clean Architecture layering, DDD bounded
contexts, database-per-service-schema, JWT + refresh token rotation, RBAC model,
namespace strategy, monorepo layout).

### Updated Technology Choices

| Concern | Original (Spring Boot) | New (NestJS) |
|---|---|---|
| Language/Runtime | Java 21 | TypeScript / Node.js 20 LTS |
| Web framework | Spring Web (Spring MVC) | NestJS (Express adapter) |
| DI / Module system | Spring IoC | Nest's built-in DI/module system |
| ORM | Spring Data JPA / Hibernate | TypeORM (entities + migrations) |
| Validation | jakarta.validation (Bean Validation) | class-validator + class-transformer |
| Security | Spring Security | @nestjs/passport + passport-jwt + custom Guards |
| Password hashing | BCrypt (Spring Security) | bcrypt (npm package) |
| OpenAPI | springdoc-openapi | @nestjs/swagger |
| DB migrations | Flyway | TypeORM migrations (SQL-based, same migration files reusable nearly as-is) |
| Unit/Integration tests | JUnit5 + Mockito + Testcontainers | Jest + Testcontainers (testcontainers npm) |
| Build tool | Maven | npm workspaces (monorepo) |
| Observability | Micrometer + OTel Java agent | @opentelemetry/sdk-node + nestjs-otel |

### Why NestJS specifically
- Closest architectural match to the original Spring Boot design: decorators, modules,
  dependency injection, guards (≈ Spring Security filters), interceptors, pipes
  (≈ Bean Validation) — so the Clean Architecture layering from ADR-0002
  (`domain/`, `application/`, `infrastructure/`) ports over with minimal conceptual
  change.
- Same language (TypeScript) as the React frontend — reduces total concepts the project
  owner needs to hold simultaneously while learning.
- First-class OpenAPI generation, Jest testing, and a mature ecosystem for JWT/RBAC.

## Updated Repository Structure (backend/)

```
backend/
├── package.json            # npm workspaces root
├── tsconfig.base.json       # shared TS compiler config
├── common/                   # @idp/common shared library
│   └── src/
│       ├── error/            # ApiException, GlobalExceptionFilter, ErrorResponse
│       ├── audit/             # AuditEvent, AuditPublisher port
│       └── dto/                # PageResponse, etc.
└── auth-service/              # NestJS app
    └── src/
        ├── domain/             # Entities (plain classes), repository ports, domain exceptions
        ├── application/         # Use cases, application ports (tokens for DI)
        ├── infrastructure/
        │   ├── persistence/      # TypeORM entities, repository adapters, migrations
        │   ├── security/          # JWT strategy, guards, password hasher, token provider
        │   ├── web/                # Controllers, DTOs
        │   └── audit/              # AuditPublisher implementation
        └── auth.module.ts
```

## Consequences
- ADR-0002's "Internal Architecture per Service" Java package layout is superseded by the
  TypeScript folder layout above; the *bounded contexts* and *layering principles*
  (domain has zero framework dependencies, application defines ports, infrastructure
  implements adapters) remain unchanged.
- All future services (`service-catalog-service`, `repository-service`, etc.) will be
  scaffolded as NestJS apps following this same template.
- CI workflows are rewritten for Node.js (npm ci, eslint, jest, docker build) instead of
  Maven.
- Coverage gates remain: backend ≥ 80% (enforced via Jest `coverageThreshold`), frontend
  ≥ 70%.
- README.md and roadmap.md tech stack references are updated accordingly.
