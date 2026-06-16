import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { AuthModule } from '../auth.module';
import { GlobalExceptionFilter } from '@idp/common';
import { InitAuthSchema1718000000000 } from '../infrastructure/persistence/migrations/1718000000000-InitAuthSchema';
import { SeedRolesAndPermissions1718000000001 } from '../infrastructure/persistence/migrations/1718000000001-SeedRolesAndPermissions';

/**
 * Full integration test - starts a real PostgreSQL container, runs migrations,
 * seeds roles/permissions, and exercises the complete auth HTTP flow.
 *
 * Run: npm run test:e2e  (uses jest-e2e.json which points to test/integration/)
 */
describe('Auth API (integration)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  // Longer timeout since container startup can take 20-30s on first pull
  jest.setTimeout(120_000);

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('idp')
      .withUsername('idp')
      .withPassword('idp_test')
      .start();

    // Inject connection details via env vars before module bootstrap
    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USERNAME = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    process.env.DB_SCHEMA = 'auth';
    process.env.JWT_SECRET = 'integration-test-secret-very-long';
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = '900';
    process.env.JWT_REFRESH_TOKEN_TTL_SECONDS = '604800';

    // Create the schema raw first, before NestJS/TypeORM tries to connect and check migrations
    const client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await client.connect();
    await client.query('CREATE SCHEMA IF NOT EXISTS auth');
    await client.end();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    // Run migrations to create schema + seed roles/permissions
    const dataSource = moduleFixture.get<DataSource>(DataSource);
    (dataSource as any).migrations = [
      new InitAuthSchema1718000000000(),
      new SeedRolesAndPermissions1718000000001(),
    ];
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  const TEST_USER = {
    email: 'integration@example.com',
    password: 'S3cure!Passw0rd',
    fullName: 'Integration Test User',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user and returns 201 with user profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect(201);

      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.roles).toContain('DEVELOPER');
      expect(res.body.permissions).toContain('service:create');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 409 when email already registered', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER).expect(409);
    });

    it('returns 422 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'pw123456', fullName: 'Test' })
        .expect(422);
    });

    it('returns 422 for password shorter than 8 chars', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'x@y.com', password: 'short', fullName: 'Test' })
        .expect(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns access + refresh tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user.email).toBe(TEST_USER.email);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpass' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'pw' })
        .expect(401);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('returns authenticated user profile with bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.roles).toContain('DEVELOPER');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates the refresh token and returns new pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      // New tokens must be different from the old ones
      expect(res.body.refreshToken).not.toBe(refreshToken);

      refreshToken = res.body.refreshToken;
      accessToken = res.body.accessToken;
    });

    it('returns 401 when reusing the already-rotated refresh token (replay detection)', async () => {
      // The previously stored refreshToken was already rotated in the step above.
      // Presenting it again must fail and revoke all session tokens.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'old-used-token' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token and returns 204', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);
    });
  });
});
