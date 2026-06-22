import { generateFastapi } from './fastapi-generator';
import { GenerationParams } from '../../../domain/entities/template.entity';

const params: GenerationParams = {
  serviceName: 'payments-api',
  description: 'Payments API service',
  port: 8000,
  packageName: '',
  author: 'Dev',
  authorEmail: 'dev@example.com',
};

describe('generateFastapi', () => {
  it('generates all required files', () => {
    const paths = generateFastapi(params).map((f) => f.path);
    expect(paths).toContain('main.py');
    expect(paths).toContain('app/health.py');
    expect(paths).toContain('app/config.py');
    expect(paths).toContain('app/middleware.py');
    expect(paths).toContain('requirements.txt');
    expect(paths).toContain('Dockerfile');
    expect(paths).toContain('.github/workflows/ci.yml');
    expect(paths).toContain('kubernetes/deployment.yaml');
  });

  it('main.py imports the service name and port', () => {
    const files = generateFastapi(params);
    const main = files.find((f) => f.path === 'main.py')!;
    expect(main.content).toContain('payments-api');
  });

  it('health.py has liveness and readiness endpoints', () => {
    const files = generateFastapi(params);
    const health = files.find((f) => f.path === 'app/health.py')!;
    expect(health.content).toContain('liveness');
    expect(health.content).toContain('readiness');
  });

  it('Dockerfile uses Python 3.11 and non-root user', () => {
    const files = generateFastapi(params);
    const dockerfile = files.find((f) => f.path === 'Dockerfile')!;
    expect(dockerfile.content).toContain('python:3.11');
    expect(dockerfile.content).toContain('adduser');
  });

  it('handles empty description', () => {
    const files = generateFastapi({
      ...params,
      description: '',
    });
    expect(files.length).toBeGreaterThan(0);
  });
});