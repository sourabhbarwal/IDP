import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAuthSchema1718000000000 implements MigrationInterface {
  name = 'InitAuthSchema1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE auth.roles (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(64) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at  TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth.permissions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(128) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at  TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth.role_permissions (
        role_id       UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth.users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email           VARCHAR(255) NOT NULL UNIQUE,
        password_hash   VARCHAR(255) NOT NULL,
        full_name       VARCHAR(255) NOT NULL,
        status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        organization_id UUID,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by      UUID,
        updated_by      UUID,
        deleted_at      TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_email ON auth.users (email) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_users_organization_id ON auth.users (organization_id)`);

    await queryRunner.query(`
      CREATE TABLE auth.user_roles (
        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id     UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        assigned_by UUID,
        PRIMARY KEY (user_id, role_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_roles_user_id ON auth.user_roles (user_id)`);

    await queryRunner.query(`
      CREATE TABLE auth.refresh_tokens (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        token_hash           VARCHAR(255) NOT NULL UNIQUE,
        expires_at           TIMESTAMPTZ NOT NULL,
        revoked_at           TIMESTAMPTZ,
        replaced_by_token_id UUID REFERENCES auth.refresh_tokens(id),
        created_by_ip        VARCHAR(64),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_token_hash ON auth.refresh_tokens (token_hash)`);

    await queryRunner.query(`
      CREATE TABLE auth.audit_logs (
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
    await queryRunner.query(`CREATE INDEX idx_audit_logs_user_id ON auth.audit_logs (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created_at ON auth.audit_logs (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auth.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.users`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.roles`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS auth`);
  }
}
