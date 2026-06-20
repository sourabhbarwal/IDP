import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { ServiceCatalogModule } from '../service-catalog.module';
import { GlobalExceptionFilter } from '@idp/common';
import * as jwt from 'jsonwebtoken';

jest.setTimeout(120_000);

const JWT_SECRET = 'integration-test-secret-long-enough';

function makeToken(permissions: string[] = ['service:create', 'service:read', 'service:update', 'service:delete']): string {
  return jwt.sign(
    { sub: 'user-test-id', email: 'test@example.com', roles: ['DEVELOPER'], permissions },
    JWT_SECRET,
    { issuer: 'idp-platform', expiresIn: 900 },
  );
}

describe('Service Catalog API (integration)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let authHeader: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('idp').withUsername('idp').withPassword('idp_test').start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USERNAME = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    process.env.JWT_SECRET = JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ServiceCatalogModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const dataSource = moduleFixture.get<DataSource>(DataSource);
    await dataSource.runMigrations();

    authHeader = `Bearer ${makeToken()}`;
  });

  afterAll(async () => { await app.close(); await container.stop(); });

  let createdServiceId: string;

  describe('POST /api/v1/services', () => {
    it('creates a service and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', authHeader)
        .send({ name: 'Test Service', type: 'NODEJS', description: 'A test service', tags: ['test'] })
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

      res.body.content.forEach((s: { type: string }) => expect(s.type).toBe('NODEJS'));
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