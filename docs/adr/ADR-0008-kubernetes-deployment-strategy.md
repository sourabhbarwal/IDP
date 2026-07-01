# ADR-0008: Kubernetes Deployment Strategy (kind + Helm)

## Status
Accepted

## Date
2026-07-01

## Context
Per ADR-0007, we deploy locally using kind instead of AWS EKS. This ADR
covers the concrete Kubernetes architecture: namespace strategy, Helm
chart structure, and the `deployment-service` implementation.

## Decision

### Cluster
Single kind cluster `idp-platform` with 1 control-plane + 2 worker nodes,
sized for 8GB RAM machines (6GB allocated to Docker Desktop).

### Namespace Strategy (per master spec)
`<environment>-<service-name>`, e.g. `dev-auth-service`, `staging-auth-service`.
For local kind, we only use `dev-*` namespaces (staging/prod namespaces are
created but typically empty, demonstrating the pattern without needing
3x the resources).

A shared `platform` namespace hosts cluster-wide resources: ingress
controller, cert-manager (future), and shared observability (Phase 7).

### Helm Chart Structure