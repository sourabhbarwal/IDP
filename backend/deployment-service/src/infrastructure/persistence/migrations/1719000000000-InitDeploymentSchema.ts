import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDeploymentSchema1719000000000 implements MigrationInterface {
  name = 'InitDeploymentSchema1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS deployment`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE deployment.deployments (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id          UUID NOT NULL,
        service_name        VARCHAR(100) NOT NULL,
        environment         VARCHAR(20) NOT NULL,
        namespace           VARCHAR(150) NOT NULL,
        image_tag           VARCHAR(200) NOT NULL,
        strategy            VARCHAR(20) NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        previous_image_tag  VARCHAR(200),
        replicas            INT NOT NULL DEFAULT 1,
        canary_weight       INT,
        error_message       TEXT,
        triggered_by        UUID NOT NULL,
        started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_deployments_service_id ON deployment.deployments (service_id)`);
    await queryRunner.query(`CREATE INDEX idx_deployments_environment ON deployment.deployments (environment)`);
    await queryRunner.query(`CREATE INDEX idx_deployments_status ON deployment.deployments (status)`);
    await queryRunner.query(`CREATE INDEX idx_deployments_created_at ON deployment.deployments (created_at)`);

    await queryRunner.query(`
      CREATE TABLE deployment.audit_logs (
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
    await queryRunner.query(`DROP TABLE IF EXISTS deployment.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS deployment.deployments`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS deployment`);
  }
}