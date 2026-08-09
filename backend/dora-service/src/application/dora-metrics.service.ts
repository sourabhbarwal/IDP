import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DoraMetrics, DeploymentFrequencyTrend } from '../domain/entities/dora-metrics.entity';

interface DeployRow {
  day:           string;
  total:         string;
  succeeded:     string;
  failed:        string;
  avg_duration_seconds: string | null;
}

interface MttrRow {
  avg_mttr_seconds: string | null;
  total_incidents:  string;
}

/**
 * Computes DORA metrics from raw SQL queries across the shared database.
 * Reads from:
 *   deployment.deployments — frequency, lead time, change failure rate
 *   alert.alert_events     — MTTR
 *
 * No ORM entities — raw SQL gives full control over GROUP BY and
 * date arithmetic across schemas.
 */
@Injectable()
export class DoraMetricsService {
  private readonly logger = new Logger(DoraMetricsService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async compute(windowDays = 30): Promise<DoraMetrics> {
    const [deployRows, mttrRow] = await Promise.all([
      this.queryDeployments(windowDays),
      this.queryMttr(windowDays),
    ]);

    return this.buildMetrics(deployRows, mttrRow, windowDays);
  }

  // ── Private SQL queries ───────────────────────────────────────────────────

  private async queryDeployments(windowDays: number): Promise<DeployRow[]> {
    const sql = `
      SELECT
        DATE_TRUNC('day', created_at)::date::text                    AS day,
        COUNT(*)::text                                                AS total,
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::text           AS succeeded,
        COUNT(*) FILTER (WHERE status IN ('FAILED','ROLLED_BACK'))::text AS failed,
        AVG(
          EXTRACT(EPOCH FROM (completed_at - started_at))
        ) FILTER (WHERE status = 'SUCCEEDED' AND completed_at IS NOT NULL)::text
                                                                      AS avg_duration_seconds
      FROM deployment.deployments
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', created_at)::date
      ORDER BY day ASC
    `;

    try {
      return await this.db.query(sql, [windowDays]);
    } catch (error) {
      this.logger.error(`Deployment query failed: ${error}`);
      return [];
    }
  }

  private async queryMttr(windowDays: number): Promise<MttrRow> {
    const sql = `
      SELECT
        AVG(
          EXTRACT(EPOCH FROM (
            COALESCE(acknowledged_at, ends_at, NOW()) - starts_at
          ))
        ) FILTER (
          WHERE status IN ('ACKNOWLEDGED', 'RESOLVED')
            AND starts_at >= NOW() - ($1 || ' days')::INTERVAL
        )::text AS avg_mttr_seconds,
        COUNT(*) FILTER (
          WHERE status IN ('ACKNOWLEDGED', 'RESOLVED')
            AND starts_at >= NOW() - ($1 || ' days')::INTERVAL
        )::text AS total_incidents
      FROM alert.alert_events
    `;

    try {
      const rows = await this.db.query(sql, [windowDays]);
      return rows[0] as MttrRow ?? { avg_mttr_seconds: null, total_incidents: '0' };
    } catch (error) {
      this.logger.error(`MTTR query failed: ${error}`);
      return { avg_mttr_seconds: null, total_incidents: '0' };
    }
  }

  // ── Metric computation ────────────────────────────────────────────────────

  private buildMetrics(
    deployRows: DeployRow[],
    mttrRow: MttrRow,
    windowDays: number,
  ): DoraMetrics {
    // ── Deployment Frequency ─────────────────────────────────────────────
    const totalDeployments = deployRows.reduce((s, r) => s + parseInt(r.total, 10), 0);
    const totalSucceeded   = deployRows.reduce((s, r) => s + parseInt(r.succeeded, 10), 0);
    const totalFailures    = deployRows.reduce((s, r) => s + parseInt(r.failed, 10), 0);

    const deploymentFrequencyPerDay =
      windowDays > 0 ? Math.round((totalSucceeded / windowDays) * 1000) / 1000 : 0;

    // ── Lead Time ────────────────────────────────────────────────────────
    // Average deployment duration across all days (weighted by day count)
    const durationsWithData = deployRows.filter((r) => r.avg_duration_seconds !== null);
    const avgDurationSeconds =
      durationsWithData.length > 0
        ? durationsWithData.reduce((s, r) => s + parseFloat(r.avg_duration_seconds!), 0) /
          durationsWithData.length
        : 0;
    const leadTimeHours = Math.round((avgDurationSeconds / 3600) * 100) / 100;

    // ── Change Failure Rate ───────────────────────────────────────────────
    const changeFailureRatePercent =
      totalDeployments > 0
        ? Math.round((totalFailures / totalDeployments) * 1000) / 10  // 1 decimal
        : 0;

    // ── MTTR ─────────────────────────────────────────────────────────────
    const avgMttrSeconds =
      mttrRow.avg_mttr_seconds ? parseFloat(mttrRow.avg_mttr_seconds) : 0;
    const mttrHours      = Math.round((avgMttrSeconds / 3600) * 100) / 100;
    const totalIncidents = parseInt(mttrRow.total_incidents, 10);

    // ── Trend ─────────────────────────────────────────────────────────────
    const deploymentTrend: DeploymentFrequencyTrend[] = deployRows.map((r) => ({
      date:        r.day,
      deployments: parseInt(r.succeeded, 10),
      failures:    parseInt(r.failed, 10),
    }));

    return new DoraMetrics({
      deploymentFrequencyPerDay,
      leadTimeHours,
      changeFailureRatePercent,
      mttrHours,
      deploymentTrend,
      windowDays,
      totalDeployments,
      totalFailures,
      totalIncidents,
    });
  }
}