import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAlertSchema1720000000000 implements MigrationInterface {
  name = 'InitAlertSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS alert`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE alert.alert_rules (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(200) NOT NULL UNIQUE,
        description      TEXT,
        promql_expression TEXT NOT NULL,
        for_duration     VARCHAR(20) NOT NULL DEFAULT '5m',
        severity         VARCHAR(20) NOT NULL,
        service_id       UUID,
        labels           JSONB NOT NULL DEFAULT '{}',
        annotations      JSONB NOT NULL DEFAULT '{}',
        enabled          BOOLEAN NOT NULL DEFAULT TRUE,
        created_by       UUID NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE alert.alert_events (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_name       VARCHAR(200) NOT NULL,
        severity         VARCHAR(20) NOT NULL,
        status           VARCHAR(20) NOT NULL DEFAULT 'firing',
        namespace        VARCHAR(150),
        service_id       UUID,
        labels           JSONB NOT NULL DEFAULT '{}',
        annotations      JSONB NOT NULL DEFAULT '{}',
        starts_at        TIMESTAMPTZ NOT NULL,
        ends_at          TIMESTAMPTZ,
        acknowledged_by  UUID,
        acknowledged_at  TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_alert_events_status ON alert.alert_events (status)`);
    await queryRunner.query(`CREATE INDEX idx_alert_events_alert_name ON alert.alert_events (alert_name)`);

    await queryRunner.query(`
      CREATE TABLE alert.audit_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID,
        action        VARCHAR(64) NOT NULL,
        resource_type VARCHAR(64) NOT NULL,
        resource_id   VARCHAR(128),
        result        VARCHAR(32) NOT NULL,
        ip_address    VARCHAR(64),
        metadata      JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS alert.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert.alert_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert.alert_rules`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS alert`);
  }
}