import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { GlobalExceptionFilter, applySecurity } from '@idp/common';

/**
 * Security integration smoke test — verifies that Helmet headers
 * are present on every response. Does not need Postgres (no DB calls).
 */
describe('Security Headers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Minimal env for JWT strategy to boot
    process.env.JWT_SECRET = 'test-secret-long-enough-for-hs256';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'idp';
    process.env.DB_PASSWORD = '***REMOVED***';
    process.env.DB_NAME = 'idp';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applySecurity(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('sets X-Content-Type-Options header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets X-XSS-Protection header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-xss-protection']).toBeDefined();
  });

  it('sets Strict-Transport-Security header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
  });

  it('sets Referrer-Policy header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['referrer-policy']).toBeDefined();
  });
});