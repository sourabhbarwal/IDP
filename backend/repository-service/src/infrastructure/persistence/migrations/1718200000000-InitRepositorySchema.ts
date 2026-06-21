import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRepositorySchema1718200000000 implements MigrationInterface {
  name = 'InitRepositorySchema1718200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS repository`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE repository.repositories (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id      UUID NOT NULL UNIQUE,
        service_name    VARCHAR(100) NOT NULL,
        service_type    VARCHAR(50) NOT NULL,
        github_owner    VARCHAR(100) NOT NULL,
        github_repo     VARCHAR(100) NOT NULL,
        full_name       VARCHAR(255) NOT NULL,
        default_branch  VARCHAR(100) NOT NULL DEFAULT 'main',
        html_url        VARCHAR(500) NOT NULL,
        clone_url       VARCHAR(500) NOT NULL,
        ssh_url         VARCHAR(500) NOT NULL,
        visibility      VARCHAR(50) NOT NULL DEFAULT 'private',
        status          VARCHAR(50) NOT NULL DEFAULT 'PROVISIONING',
        provisioned_by  UUID NOT NULL,
        provisioned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        error_message   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_repositories_service_id ON repository.repositories (service_id)`);
    await queryRunner.query(`CREATE INDEX idx_repositories_status ON repository.repositories (status)`);

    await queryRunner.query(`
      CREATE TABLE repository.audit_logs (
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
    await queryRunner.query(`DROP TABLE IF EXISTS repository.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS repository.repositories`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS repository`);
  }
}