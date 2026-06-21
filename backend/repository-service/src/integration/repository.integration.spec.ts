import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { RepositoryModule } from '../repository.module';
import { GlobalExceptionFilter } from '@idp/common';
import { GITHUB_CLIENT } from '../application/ports/github-client.port';
import * as jwt from 'jsonwebtoken';

jest.setTimeout(120_000);

jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({})),
  };
});

const JWT_SECRET = 'integration-test-secret-long-enough';

// Mock GitHub client — we don't make real GitHub API calls in CI
const mockGithubClient = {
  createRepository: jest.fn().mockResolvedValue({
    fullName: 'test-org/test-service',
    htmlUrl: 'https://github.com/test-org/test-service',
    cloneUrl: 'https://github.com/test-org/test-service.git',
    sshUrl: 'git@github.com:test-org/test-service.git',
    defaultBranch: 'main',
  }),
  createOrUpdateFile: jest.fn().mockResolvedValue(undefined),
  configureBranchProtection: jest.fn().mockResolvedValue(undefined),
};

function makeToken(): string {
  return jwt.sign(
    {
      sub: 'e252873e-4bb7-42cf-b3b0-60caadcdd808', email: 'test@example.com',
      roles: ['DEVELOPER'],
      permissions: ['repository:provision', 'service:read'],
    },
    JWT_SECRET,
    { issuer: 'idp-platform', expiresIn: 900 },
  );
}

describe('Repository Service API (integration)', () => {
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
    process.env.GITHUB_TOKEN = 'mock-token';
    process.env.GITHUB_OWNER = 'test-org';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RepositoryModule],
    })
      .overrideProvider(GITHUB_CLIENT)
      .useValue(mockGithubClient)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const dataSource = moduleFixture.get<DataSource>(DataSource);
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS repository;');
    await dataSource.runMigrations();

    authHeader = `Bearer ${makeToken()}`;
  });

  afterAll(async () => { await app.close(); await container.stop(); });

  const SERVICE_ID = '550e8400-e29b-41d4-a716-446655440000';
  let createdRepoId: string;

  describe('POST /api/v1/repositories', () => {
    it('provisions a repository and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/repositories')
        .set('Authorization', authHeader)
        .send({
          serviceId: SERVICE_ID,
          serviceName: 'test-service',
          serviceType: 'NODEJS',
          description: 'Integration test service',
          visibility: 'private',
        })
        .expect(201);

      expect(res.body.serviceId).toBe(SERVICE_ID);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.fullName).toBe('test-org/test-service');
      expect(mockGithubClient.createRepository).toHaveBeenCalled();
      expect(mockGithubClient.createOrUpdateFile).toHaveBeenCalled();
      createdRepoId = res.body.id;
    });

    it('returns 409 for duplicate service provisioning', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/repositories')
        .set('Authorization', authHeader)
        .send({
          serviceId: SERVICE_ID,
          serviceName: 'test-service',
          serviceType: 'NODEJS',
        })
        .expect(409);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/repositories')
        .send({ serviceId: SERVICE_ID, serviceName: 'x', serviceType: 'NODEJS' })
        .expect(401);
    });
  });

  describe('GET /api/v1/repositories/by-service/:serviceId', () => {
    it('returns repository by service ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/repositories/by-service/${SERVICE_ID}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body.serviceId).toBe(SERVICE_ID);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('returns 404 for unknown service ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/repositories/by-service/00000000-0000-0000-0000-000000000099')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('GET /api/v1/repositories/:id', () => {
    it('returns repository by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/repositories/${createdRepoId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body.id).toBe(createdRepoId);
    });
  });

  describe('GET /api/v1/repositories', () => {
    it('returns paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/repositories')
        .set('Authorization', authHeader)
        .expect(200);

      expect(res.body.content).toBeInstanceOf(Array);
      expect(res.body.totalElements).toBeGreaterThan(0);
    });
  });
});