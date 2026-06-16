/**
 * Standard audit event published by every service for state-changing actions
 * (login, logout, deployments, rollbacks, secret access, user management,
 * permission changes, etc.) Captures user, action, timestamp, resource, result, IP.
 */
export interface AuditEvent {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  ipAddress: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function createAuditEvent(params: {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  ipAddress: string | null;
  metadata?: Record<string, unknown>;
}): AuditEvent {
  return { ...params, timestamp: new Date().toISOString() };
}

/**
 * Port for publishing audit events. Phase 1 services provide a local
 * (log + DB table) implementation. Once `audit-service` exists, a Redis
 * Streams-backed implementation is plugged in without touching use cases
 * (Dependency Inversion).
 */
export const AUDIT_PUBLISHER = 'AUDIT_PUBLISHER';

export interface AuditPublisher {
  publish(event: AuditEvent): Promise<void>;
}
