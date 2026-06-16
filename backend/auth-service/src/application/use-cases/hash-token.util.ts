import { createHash } from 'crypto';

/**
 * Refresh tokens are stored as SHA-256 hashes (never plain text), per ADR-0003.
 * The plain value is returned to the client once and never persisted.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
