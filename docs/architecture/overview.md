# Architecture Overview

## C1: System Context

```mermaid
graph TB
    Dev[Developer / DevOps Engineer / Platform Engineer]
    SecAdmin[Security Admin / Org Admin]
    IDP[IDP Platform]
    GitHub[GitHub]
    AWS[AWS Cloud: EKS, RDS, ElastiCache, S3, ECR, Route53]
    Slack[Slack / Discord / Email / Webhooks]
    LLM[AI Provider - LLM API]

    Dev -->|Uses| IDP
    SecAdmin -->|Administers| IDP
    IDP -->|Provisions repos, CI/CD| GitHub
    IDP -->|Deploys & observes workloads| AWS
    IDP -->|Sends alerts & notifications| Slack
    IDP -->|AI Copilot queries| LLM
```

## C2: Container Diagram

```mermaid
graph TB
    subgraph Client
        FE[React + TS Frontend - Portal UI]
    end

    subgraph "EKS Cluster - idp-platform namespace"
        GW[API Gateway / Ingress]
        AUTH[auth-service]
        CATALOG[service-catalog-service]
        REPO[repository-service]
        TPL[template-service]
        DEPLOY[deployment-service]
        MON[monitoring-service]
        LOG[logging-service]
        ALERT[alert-service]
        NOTIFY[notification-service]
        AUDIT[audit-service]
        COST[cost-service]
        AI[ai-copilot service]
    end

    subgraph Data
        PG[(PostgreSQL - RDS)]
        REDIS[(Redis - ElastiCache)]
        VAULT[(HashiCorp Vault - prod secrets)]
    end

    subgraph Observability
        PROM[Prometheus]
        GRAF[Grafana]
        LOKI[Loki]
        AM[AlertManager]
        OTEL[OTel Collector]
    end

    FE -->|HTTPS / JWT| GW
    GW --> AUTH
    GW --> CATALOG
    GW --> REPO
    GW --> TPL
    GW --> DEPLOY
    GW --> MON
    GW --> LOG
    GW --> ALERT
    GW --> COST
    GW --> AI

    AUTH --> PG
    CATALOG --> PG
    REPO --> PG
    DEPLOY --> PG
    ALERT --> PG
    NOTIFY --> PG
    AUDIT --> PG
    COST --> PG

    AUTH --> REDIS
    CATALOG --> REDIS
    DEPLOY --> REDIS

    DEPLOY -->|emits events| REDIS
    AUDIT -->|consumes events| REDIS
    NOTIFY -->|consumes events| REDIS

    AUTH -.->|prod secrets| VAULT
    DEPLOY -.->|prod secrets| VAULT

    MON --> PROM
    LOG --> LOKI
    ALERT --> AM
    AUTH --> OTEL
    CATALOG --> OTEL
    DEPLOY --> OTEL
    PROM --> GRAF
    LOKI --> GRAF
```

## Namespace Strategy

```mermaid
graph LR
    subgraph "EKS Cluster"
        subgraph dev
            d1[dev-auth-service]
            d2[dev-deployment-service]
            d3[dev-...]
        end
        subgraph staging
            s1[staging-auth-service]
            s2[staging-deployment-service]
        end
        subgraph prod
            p1[prod-auth-service]
            p2[prod-deployment-service]
        end
        subgraph platform
            mon[monitoring: prometheus, grafana, loki, alertmanager]
            ai[ai-copilot]
            vault[vault]
        end
    end
```

Each service-environment pair gets its own namespace (`<env>-<service-name>`), each with
its own ResourceQuota, NetworkPolicy, and RBAC bindings. The `platform` namespace group
hosts shared platform services (observability stack, AI Copilot, Vault) which serve all
environments.

## Deployment Strategies (per `deployment-service`)

```mermaid
graph LR
    A[New Image Pushed to ECR] --> B{Strategy}
    B -->|Rolling| C[Gradual pod replacement<br/>maxSurge/maxUnavailable]
    B -->|Blue-Green| D[Deploy green env<br/>switch Service selector]
    B -->|Canary| E[Deploy canary subset<br/>shift traffic % via Ingress]
    C --> F[Health checks pass?]
    D --> F
    E --> F
    F -->|No| G[Automatic Rollback]
    F -->|Yes| H[Promote to next environment]
```

## Request Flow Example: Create Service → Provision Repository → Generate Project

```mermaid
sequenceDiagram
    participant U as User (Frontend)
    participant CAT as service-catalog-service
    participant REPO as repository-service
    participant TPL as template-service
    participant GH as GitHub
    participant AUDIT as audit-service

    U->>CAT: POST /services {name, owner, type}
    CAT->>CAT: Validate, persist service + initial version
    CAT->>REPO: POST /repositories {serviceId, template}
    REPO->>GH: Create repo, branch protection, CODEOWNERS, templates
    REPO->>TPL: Generate project files for chosen stack
    TPL-->>REPO: Generated file tree (Dockerfile, CI, k8s manifests, etc.)
    REPO->>GH: Commit generated files
    REPO-->>CAT: repositoryUrl, status
    CAT-->>U: 201 Created {service, repositoryUrl}
    CAT-->>AUDIT: ServiceCreated event (async)
```

## Document Index
- `roadmap.md` — phase-by-phase delivery plan with checkpoints
- `database-schema.md` — full ER design (added in Phase 1)
- `security-architecture.md` — added in Phase 10
- `ai-copilot-architecture.md` — added in Phase 11
