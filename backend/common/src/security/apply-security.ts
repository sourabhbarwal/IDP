import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Applies uniform security hardening to every IDP Platform NestJS service.
 * Call this in main.ts after creating the app, before app.listen().
 *
 * What it does:
 * 1. Helmet — sets 10+ security response headers (XSS, clickjacking, MIME sniffing, etc.)
 * 2. Request size limit — rejects bodies > 1MB to prevent payload flooding
 *
 * Rate limiting is configured per-module via ThrottlerModule (see each module's
 * imports array) and enforced via a global ThrottlerGuard APP_GUARD provider.
 *
 * See docs/adr/ADR-0012-security-hardening.md for the full rationale.
 */
export function applySecurity(app: INestApplication): void {
  // ── 1. Security headers via Helmet ────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31_536_000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // Explicitly force DENY per ADR-0012 — Helmet's own default is
      // SAMEORIGIN, which does not match our documented security posture.
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
      crossOriginEmbedderPolicy: false, // disable — breaks API clients
    }),
  );

  // ── 2. Request size limit — prevent payload flooding ──────────────────────
  // NestJS applies express.json() internally; we override the limit here.
  // 1MB is generous for all IDP Platform API payloads.
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: false, limit: '1mb' }));
}