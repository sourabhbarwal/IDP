# ADR-0005: GitHub Integration Strategy

## Status
Accepted

## Date
2026-06-21

## Context
The platform must auto-provision GitHub repositories for services including:
branch protection, CODEOWNERS, templates, CI/CD workflows, and generated
project files. We need to decide between a GitHub App or a Personal Access
Token (PAT) for authenticating against the GitHub API.

## Decision

### MVP (Phase 3): Personal Access Token (PAT)
Use a GitHub PAT stored as a Kubernetes Secret / environment variable.
- Simple to configure — no GitHub App registration needed
- Sufficient for single-organization setups
- Must have scopes: `repo`, `admin:org` (for branch protection), `workflow`

### Production Path (Phase 10): GitHub App
Migrate to a GitHub App:
- Fine-grained, per-repository permissions
- No user-tied credentials (won't break if someone leaves)
- Supports installation tokens that auto-expire
- Required for multi-organization setups

### API Client
Use `@octokit/rest` (official GitHub REST client) with a thin port interface
(`GithubClient`) so the actual HTTP implementation can be swapped (e.g., mock
for tests, PAT now, GitHub App later) without changing use cases.

### Generated Files Per Service Type

| File | All types | Notes |
|---|---|---|
| `README.md` | ✅ | Generated from service metadata |
| `Dockerfile` | ✅ | Multi-stage, non-root, per stack |
| `.dockerignore` | ✅ | |
| `.github/workflows/ci.yml` | ✅ | Per stack (npm/pip/go/maven) |
| `kubernetes/deployment.yaml` | ✅ | |
| `kubernetes/service.yaml` | ✅ | |
| `kubernetes/hpa.yaml` | ✅ | |
| `.github/CODEOWNERS` | ✅ | Owner from JWT claim |
| `.github/pull_request_template.md` | ✅ | |
| `.github/ISSUE_TEMPLATE/bug_report.md` | ✅ | |
| `.github/ISSUE_TEMPLATE/feature_request.md` | ✅ | |

### Branch Protection (main branch)
- Require pull request reviews: 1 approver
- Dismiss stale reviews on new push
- Require status checks to pass before merging
- Restrict direct pushes to main

## Consequences
- `GITHUB_TOKEN` and `GITHUB_OWNER` must be configured as environment
  variables in every deployment environment.
- Repository names are derived from the service name (already normalised
  to kebab-case in service-catalog-service).
- Phase 10 migration to GitHub App is a config-level change only; use
  case code is unchanged.