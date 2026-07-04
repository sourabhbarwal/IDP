import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEntry } from '../domain/entities/audit-entry.entity';

export interface AuditQueryParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  result?: 'SUCCESS' | 'FAILURE';
  sourceSchema?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  size: number;
}

export interface AuditQueryResult {
  items: AuditEntry[];
  total: number;
}

/**
 * Queries audit_logs tables across all service schemas in the shared
 * PostgreSQL database. Uses a UNION ALL to give a unified audit trail.
 *
 * Schemas queried: auth, catalog, repository, deployment, alert
 */
@Injectable()
export class AuditQueryService {
  private readonly logger = new Logger(AuditQueryService.name);

  // All schemas that have audit_logs tables
  private readonly schemas = ['auth', 'catalog', 'repository', 'deployment', 'alert'];

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    const schemasToQuery = params.sourceSchema
      ? [params.sourceSchema]
      : this.schemas;

    // Build UNION ALL query across all schema audit_logs tables
    const unionParts = schemasToQuery.map(
      (schema) => `
        SELECT
          id,
          user_id,
          action,
          resource_type,
          resource_id,
          result,
          ip_address,
          metadata,
          '${schema}' AS source_schema,
          created_at
        FROM ${schema}.audit_logs
        WHERE 1=1
        ${params.userId ? `AND user_id = '${params.userId}'` : ''}
        ${params.action ? `AND action = '${params.action}'` : ''}
        ${params.resourceType ? `AND resource_type = '${params.resourceType}'` : ''}
        ${params.resourceId ? `AND resource_id = '${params.resourceId}'` : ''}
        ${params.result ? `AND result = '${params.result}'` : ''}
        ${params.startDate ? `AND created_at >= '${params.startDate.toISOString()}'` : ''}
        ${params.endDate ? `AND created_at <= '${params.endDate.toISOString()}'` : ''}
      `,
    );

    const unionQuery = unionParts.join(' UNION ALL ');

    const countQuery = `SELECT COUNT(*) as total FROM (${unionQuery}) combined`;
    const dataQuery = `
      SELECT * FROM (${unionQuery}) combined
      ORDER BY created_at DESC
      LIMIT ${params.size}
      OFFSET ${params.page * params.size}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.dataSource.query(countQuery),
        this.dataSource.query(dataQuery),
      ]);

      const total = parseInt(countResult[0]?.total ?? '0', 10);
      const items: AuditEntry[] = dataResult.map(
        (row: Record<string, unknown>) =>
          new AuditEntry({
            id: row['id'] as string,
            userId: row['user_id'] as string | null,
            action: row['action'] as string,
            resourceType: row['resource_type'] as string,
            resourceId: row['resource_id'] as string | null,
            result: row['result'] as 'SUCCESS' | 'FAILURE',
            ipAddress: row['ip_address'] as string | null,
            metadata: row['metadata'] as Record<string, unknown> | null,
            sourceSchema: row['source_schema'] as string,
            createdAt: new Date(row['created_at'] as string),
          }),
      );

      return { items, total };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audit query failed: ${message}`);
      return { items: [], total: 0 };
    }
  }

  async getActionSummary(): Promise<Array<{ action: string; count: number; schema: string }>> {
    const unionParts = this.schemas.map(
      (schema) => `
        SELECT action, '${schema}' as schema, COUNT(*) as count
        FROM ${schema}.audit_logs
        GROUP BY action
      `,
    );

    const query = `
      SELECT action, schema, SUM(count) as count
      FROM (${unionParts.join(' UNION ALL ')}) combined
      GROUP BY action, schema
      ORDER BY count DESC
    `;

    try {
      const result = await this.dataSource.query(query);
      return result.map((row: Record<string, unknown>) => ({
        action: row['action'] as string,
        schema: row['schema'] as string,
        count: parseInt(row['count'] as string, 10),
      }));
    } catch (error) {
      this.logger.error(`Action summary query failed: ${error}`);
      return [];
    }
  }
}