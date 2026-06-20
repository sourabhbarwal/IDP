import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalogSchema1718100000000 implements MigrationInterface {
  name = 'InitCatalogSchema1718100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS catalog`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE catalog.services (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name           VARCHAR(100) NOT NULL UNIQUE,
        description    TEXT,
        type           VARCHAR(50) NOT NULL,
        status         VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        owner_id       UUID NOT NULL,
        owner_email    VARCHAR(255) NOT NULL,
        team           VARCHAR(100),
        repository_url VARCHAR(500),
        tags           TEXT[] NOT NULL DEFAULT '{}',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by     UUID NOT NULL,
        updated_by     UUID,
        deleted_at     TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_services_name ON catalog.services (name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_services_owner_id ON catalog.services (owner_id)`);
    await queryRunner.query(`CREATE INDEX idx_services_status ON catalog.services (status)`);
    await queryRunner.query(`CREATE INDEX idx_services_type ON catalog.services (type)`);

    await queryRunner.query(`
      CREATE TABLE catalog.service_versions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id  UUID NOT NULL REFERENCES catalog.services(id) ON DELETE CASCADE,
        version     VARCHAR(50) NOT NULL,
        changelog   TEXT,
        deployed_at TIMESTAMPTZ,
        environment VARCHAR(50),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by  UUID NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_service_versions_service_id ON catalog.service_versions (service_id)`);

    await queryRunner.query(`
      CREATE TABLE catalog.audit_logs (
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
    await queryRunner.query(`DROP TABLE IF EXISTS catalog.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS catalog.service_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS catalog.services`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS catalog`);
  }
}