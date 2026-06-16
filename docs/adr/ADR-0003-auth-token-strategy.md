# ADR-0003: Authentication & Token Strategy

## Status
Accepted

## Date
2026-06-12

## Context
`auth-service` must provide registration, login, logout, JWT access tokens, refresh
tokens, and RBAC for 5 roles (Developer, DevOps Engineer, Platform Engineer, Security
Admin, Organization Admin). Authentication must be < 500ms (p95) and must support 1,000+
concurrent users.

## Decision

### Token Types
- **Access Token (JWT, HS256 for MVP, RS256 path documented for prod)**: short-lived
  (15 minutes), contains `sub` (user id), `roles`, `permissions`, `iat`, `exp`, `iss`,
  `jti`.
- **Refresh Token (opaque, random 256-bit, stored hashed)**: long-lived (7 days),
  persisted in `refresh_tokens` table with `user_id`, `token_hash`, `expires_at`,
  `revoked_at`, `created_by_ip`, `replaced_by_token_id`.

### Rotation
On every `/auth/refresh` call:
1. Validate the presented refresh token against its stored hash and expiry/revocation.
2. Issue a new access token AND a new refresh token.
3. Mark the old refresh token as revoked, linking `replaced_by_token_id` to the new one
   (refresh token rotation — detects token replay: if a revoked token is presented again,
   all descendant tokens for that user are revoked and the session is force-logged-out).

### Password Storage
BCrypt (strength 12) via `application.port.PasswordHasher` — a port so the algorithm can
be swapped (e.g., Argon2) without touching use cases.

### RBAC Model
- `roles`: DEVELOPER, DEVOPS_ENGINEER, PLATFORM_ENGINEER, SECURITY_ADMIN, ORG_ADMIN
- `permissions`: fine-grained strings, e.g. `service:create`, `service:delete`,
  `deployment:rollback`, `secret:read`, `user:manage`, `audit:read`
- `role_permissions` (many-to-many) seeded via TypeORM migration with sensible defaults per role
- `user_roles` (many-to-many): a user can hold multiple roles
- JWT embeds the **union of permissions** across the user's roles at issuance time, so
  downstream services authorize via permission claims without calling back to
  auth-service on every request (stateless authorization). A permission change takes
  effect on next token refresh (≤15 min, acceptable per requirements).

### Audit
Every auth event (REGISTER, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, TOKEN_REFRESH,
TOKEN_REVOKED) is published via `AuditPublisher` port. Phase 1 ships a `NoOpAuditPublisher`
(logs locally); Phase 1.x / when `audit-service` exists, a Redis Streams-based
implementation replaces it without changing use case code (Dependency Inversion).

### Secrets (JWT signing key, DB credentials)
- **Dev/local**: Kubernetes Secret / `.env` file (gitignored), HS256 shared secret.
- **Prod**: HashiCorp Vault-issued signing key, with RS256 (asymmetric) so resource
  servers (other microservices) can validate tokens with a public key fetched from
  `/.well-known/jwks.json` without holding the private key. This migration is tracked as
  a Phase 10 task; MVP uses HS256 with a configurable secret to avoid blocking Phase 1.

## Consequences
- Other services validate JWTs locally (no network call to auth-service per request) —
  satisfies the <500ms auth and general latency targets.
- Refresh token rotation adds one extra DB write per refresh but provides replay
  detection, a standard OWASP recommendation.
- Moving from HS256 to RS256 later requires only a config + key management change, not a
  token-format change (claim structure stays the same).
