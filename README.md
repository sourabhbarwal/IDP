# IDP Platform — AI-Native Internal Developer Platform

An enterprise-grade Internal Developer Platform (IDP) that lets developers create services,
provision repositories, generate project templates, deploy to Kubernetes, observe production
systems, manage costs and secrets, and get AI-powered operational assistance — all from a
single portal.

## Status

This project is being built incrementally, phase by phase. See `docs/architecture/` for
design documentation and `docs/adr/` for architecture decision records.

## Repository Structure

```
idp-platform/
├── frontend/           # React + TypeScript + Tailwind + ShadCN UI portal
├── backend/            # NestJS/TypeScript microservices (one folder per service)
│   ├── auth-service
│   ├── service-catalog-service
│   ├── repository-service
│   ├── template-service
│   ├── deployment-service
│   ├── monitoring-service
│   ├── logging-service
│   ├── alert-service
│   ├── notification-service
│   ├── audit-service
│   └── cost-service
├── infrastructure/
│   ├── terraform/      # AWS infra: EKS, RDS, ElastiCache, S3, IAM, ECR, Route53
│   ├── helm/            # Helm charts for platform + generated services
│   └── kubernetes/      # Raw manifests / kustomize bases
├── monitoring/
│   ├── prometheus/      # Scrape configs, recording/alerting rules
│   ├── grafana/         # Dashboards as code
│   ├── loki/            # Log aggregation config
│   ├── alertmanager/    # Alert routing
│   └── otel/            # OpenTelemetry collector config
├── ai-copilot/          # AI Copilot Layer (chat, incident investigator, cost/security advisors)
├── templates/           # Project generator templates (Spring Boot, Node.js, FastAPI, Go)
├── docs/
│   ├── adr/             # Architecture Decision Records
│   ├── architecture/    # System diagrams & design docs
│   ├── api/             # OpenAPI specs
│   └── runbooks/        # Operational runbooks
├── tests/
│   ├── e2e/             # Playwright end-to-end tests
│   └── load/            # k6 load tests
└── .github/workflows/   # CI/CD pipelines
```

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Frontend       | React 18, TypeScript, TailwindCSS, Redux Toolkit, React Router, Axios, React Hook Form, Zod, Recharts, TanStack Table, ShadCN UI |
| Backend        | Node.js 20 LTS, NestJS, TypeScript, TypeORM, class-validator, Passport JWT, OpenAPI (Swagger) — see ADR-0004 |
| Database       | PostgreSQL |
| Cache          | Redis |
| Infra          | Docker, Kubernetes, Helm, Terraform |
| Cloud          | AWS (EKS, RDS, ElastiCache, S3, IAM, ECR, CloudWatch, Route53) |
| Observability  | Prometheus, Grafana, Loki, AlertManager, OpenTelemetry |
| CI/CD          | GitHub Actions |
| AI Layer       | AI Copilot (chat, incident investigation, cost & security advisors, doc generation) |

## Development Phases

The platform is built in 11 phases (Auth → Service Catalog → GitHub Integration →
Templates → Docker → Kubernetes Deployments → Observability → Alerting → Cost Analytics →
Security Hardening → AI Copilot). Each phase has its own checkpoint verification steps —
see `docs/architecture/roadmap.md`.

## Getting Started

Setup instructions per component will be added as each phase lands:
- Backend services: `backend/<service>/README.md`
- Frontend: `frontend/README.md`
- Infrastructure: `infrastructure/terraform/README.md`

## License

Internal / Proprietary (adjust as needed for your organization).
