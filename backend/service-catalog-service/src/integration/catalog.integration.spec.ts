import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { ServiceCatalogModule } from '../service-catalog.module';
import { GlobalExceptionFilter } from '@idp/common';
import * as jwt from 'jsonwebtoken';
import { ServiceOrmEntity } from '../infrastructure/persistence/orm-entities/service.orm-entity';
import { ServiceVersionOrmEntity } from '../infrastructure/persistence/orm-entities/service-version.orm-entity';
import { AuditLogOrmEntity } from '../infrastructure/persistence/orm-entities/audit-log.orm-entity';
import { InitCatalogSchema1718100000000 } from '../infrastructure/persistence/migrations/1718100000000-InitCatalogSchema';

jest.setTimeout(120_000);

const JWT_SECRET = 'integration-test-secret-long-enough-for-hs256-algorithm';

function makeToken(
  permissions: string[] = [
    'service:create',
    'service:read',
    'service:update',
    'service:delete',
  ],
): string {
  return jwt.sign(
    {
      sub: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'test@example.com',
      roles: ['DEVELOPER'],
      permissions,
    },
    JWT_SECRET,
    { issuer: 'idp-platform', expiresIn: 900 },
  );
}

describe('Service Catalog API (integration)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let authHeader: string;

  beforeAll(async () => {
    // 1. Start Postgres container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('idp')
      .withUsername('idp')
      .withPassword('idp_test')
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5432);
    const database = container.getDatabase();
    const username = container.getUsername();
    const password = container.getPassword();

    // 2. Create the catalog schema FIRST using a raw pg client
    //    TypeORM sets search_path=catalog on connect; schema must exist before that
    const pgClient = new Client({ host, port, database, user: username, password });
    await pgClient.connect();
    await pgClient.query('CREATE SCHEMA IF NOT EXISTS catalog');
    await pgClient.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await pgClient.end();

    // 3. Run migrations using a dedicated DataSource (NOT the NestJS-managed one)
    //    The NestJS TypeOrmModule doesn't have migrations configured — only runtime queries
    const migrationDataSource = new DataSource({
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      schema: 'catalog',
      entities: [ServiceOrmEntity, ServiceVersionOrmEntity, AuditLogOrmEntity],
      migrations: [InitCatalogSchema1718100000000],
      migrationsTableName: 'catalog_migrations',
    });

    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations();
    await migrationDataSource.destroy();

    // 4. Set env vars so NestJS TypeOrmModule connects to the test container
    process.env.DB_HOST = host;
    process.env.DB_PORT = port.toString();
    process.env.DB_USERNAME = username;
    process.env.DB_PASSWORD = password;
    process.env.DB_NAME = database;
    process.env.JWT_SECRET = JWT_SECRET;

    // 5. Bootstrap NestJS app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ServiceCatalogModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    authHeader = `Bearer ${makeToken()}`;
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  let createdServiceId: string;

  describe('POST /api/v1/services', () => {
    it('creates a service and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', authHeader)
        .send({
          name: 'Test Service',
          type: 'NODEJS',
          description: 'A test service',
          tags: ['test'],
        })
        .expect(201);

      expect(res.body.name).toBe('test-service');
      expect(res.body.type).toBe('NODEJS');
      expect(res.body.status).toBe('ACTIVE');
      createdServiceId = res.body.id;
    });

    it('returns 409 for duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', authHeader)
        .send({ name: 'Test Service', type: 'NODEJS' })
        .expect(409);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({ name: 'x', type: 'NODEJS' })
        .expect(401);
    });
  });

  describe('GET /api/v1/services', () => {
    it('returns paginated list of services', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/services')
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body.content).toBeInstanceOf(Array);
      expect(res.body.totalElements).toBeGreaterThan(0);
    });

    it('returns filtered list by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/services?type=NODEJS')
        .set('Authorization', authHeader)
        .expect(200);

      res.body.content.forEach((s: { type: string }) =>
        expect(s.type).toBe('NODEJS'),
      );
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('returns the service by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/services/${createdServiceId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body.id).toBe(createdServiceId);
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('PUT /api/v1/services/:id', () => {
    it('updates the service and returns updated data', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/services/${createdServiceId}`)
        .set('Authorization', authHeader)
        .send({ description: 'Updated description', team: 'platform-team' })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
      expect(res.body.team).toBe('platform-team');
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    it('soft-deletes the service and returns 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/services/${createdServiceId}`)
        .set('Authorization', authHeader)
        .expect(204);
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/services/${createdServiceId}`)
        .set('Authorization', authHeader)
        .expect(404);
    });
  });
});