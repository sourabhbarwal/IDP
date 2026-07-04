export interface AuditEntryProps {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  sourceSchema: string;
  createdAt: Date;
}

/**
 * AuditEntry — a unified view of an audit log record from any service.
 */
export class AuditEntry {
  readonly id!: string;
  readonly userId!: string | null;
  readonly action!: string;
  readonly resourceType!: string;
  readonly resourceId!: string | null;
  readonly result!: 'SUCCESS' | 'FAILURE';
  readonly ipAddress!: string | null;
  readonly metadata!: Record<string, unknown> | null;
  readonly sourceSchema!: string;
  readonly createdAt!: Date;

  constructor(props: AuditEntryProps) {
    Object.assign(this, props);
  }

  isSuccess(): boolean { return this.result === 'SUCCESS'; }
  isFailure(): boolean { return this.result === 'FAILURE'; }
}