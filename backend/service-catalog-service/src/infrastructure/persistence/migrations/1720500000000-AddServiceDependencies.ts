import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceDependencies1720500000000 implements MigrationInterface {
  name = 'AddServiceDependencies1720500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE catalog.dependency_type AS ENUM ('HARD', 'SOFT', 'ASYNC')
    `);

    await queryRunner.query(`
      CREATE TABLE catalog.service_dependencies (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id      UUID NOT NULL REFERENCES catalog.services(id) ON DELETE CASCADE,
        dependency_id   UUID NOT NULL REFERENCES catalog.services(id) ON DELETE CASCADE,
        dependency_type catalog.dependency_type NOT NULL DEFAULT 'HARD',
        description     TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(service_id, dependency_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_svc_deps_service_id    ON catalog.service_dependencies(service_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_svc_deps_dependency_id ON catalog.service_dependencies(dependency_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS catalog.service_dependencies`);
    await queryRunner.query(`DROP TYPE  IF EXISTS catalog.dependency_type`);
  }
}