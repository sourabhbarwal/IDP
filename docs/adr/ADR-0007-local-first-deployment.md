# ADR-0007: Local-First Deployment Strategy

## Status
Accepted

## Date
2026-06-22

## Context
The original spec called for AWS EKS ($73/month), RDS ($15/month),
ElastiCache ($12/month), NAT Gateway ($32/month) and ALB ($16/month).
Minimum cost: ~$150-200/month. This is not viable for a learning project.

## Decision
Deploy everything locally using free tooling that is functionally identical:

| Original (AWS) | Free Replacement | Difference |
|---|---|---|
| EKS | kind (Kubernetes in Docker) | None for dev/learning |
| RDS PostgreSQL | PostgreSQL Helm chart in kind | None |
| ElastiCache Redis | Redis Helm chart in kind | None |
| ECR | Local Docker build, no push | No remote registry |
| ALB + Route53 | Nginx Ingress + nip.io | None for dev |

## Consequences
- All Helm charts, manifests, service code, and CI pipelines are
  production-grade and would run identically on EKS.
- CI builds and scans Docker images but does not push to a registry.
- Migrating to AWS EKS requires zero code changes — only infra provisioning.
- Total monthly cost: $0.

## kind Cluster Strategy (8GB RAM, Windows)
Services are grouped into docker-compose profiles to manage memory:
- **default**: postgres, redis, auth, catalog, repository, template
- **stubs**: + deployment, monitoring, logging, alert, notification, audit, cost
- **full**: + frontend container