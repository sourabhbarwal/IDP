import { generateNodejs } from './nodejs-generator';
import { GenerationParams } from '../../../domain/entities/template.entity';

const params: GenerationParams = {
  serviceName: 'test-service',
  description: 'A test service',
  port: 3000,
  packageName: 'com.example',
  author: 'Jane Doe',
  authorEmail: 'jane@example.com',
};

describe('generateNodejs', () => {
  it('generates all required files', () => {
    const files = generateNodejs(params);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('src/index.ts');
    expect(paths).toContain('src/app.ts');
    expect(paths).toContain('src/routes/health.ts');
    expect(paths).toContain('src/routes/metrics.ts');
    expect(paths).toContain('Dockerfile');
    expect(paths).toContain('.github/workflows/ci.yml');
    expect(paths).toContain('kubernetes/deployment.yaml');
    expect(paths).toContain('kubernetes/service.yaml');
    expect(paths).toContain('kubernetes/hpa.yaml');
    expect(paths).toContain('README.md');
  });

  it('package.json contains the service name', () => {
    const files = generateNodejs(params);
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
    expect(pkg.name).toBe('test-service');
  });

  it('src/index.ts includes configured port', () => {
    const files = generateNodejs({ ...params, port: 4000 });
    const index = files.find((f) => f.path === 'src/index.ts')!;
    expect(index.content).toContain('4000');
  });

  it('health route exports GET / and GET /ready', () => {
    const files = generateNodejs(params);
    const health = files.find((f) => f.path === 'src/routes/health.ts')!;
    expect(health.content).toContain("get('/'");
    expect(health.content).toContain("get('/ready'");
  });

  it('Dockerfile is multi-stage and runs as non-root', () => {
    const files = generateNodejs(params);
    const dockerfile = files.find((f) => f.path === 'Dockerfile')!;
    expect(dockerfile.content).toContain('AS builder');
    expect(dockerfile.content).toContain('AS production');
    expect(dockerfile.content).toContain('adduser');
  });

  it('kubernetes deployment references service name and port', () => {
    const files = generateNodejs(params);
    const deployment = files.find((f) => f.path === 'kubernetes/deployment.yaml')!;
    expect(deployment.content).toContain('test-service');
    expect(deployment.content).toContain('3000');
  });

  it('all file contents are non-empty strings', () => {
    const files = generateNodejs(params);
    files.forEach((f) => expect(f.content.length).toBeGreaterThan(0));
  });

  it('handles empty description', () => {
    const files = generateNodejs({
      ...params,
      description: '',
    });
    expect(files.length).toBeGreaterThan(0);
  });
});