import { FileGeneratorService } from './file-generator.service';

describe('FileGeneratorService', () => {
  let service: FileGeneratorService;
  beforeEach(() => { service = new FileGeneratorService(); });

  const baseParams = {
    serviceName: 'my-api',
    serviceType: 'NODEJS',
    description: 'A test service',
    owner: 'test-org',
    ownerEmail: 'dev@example.com',
    repoFullName: 'test-org/my-api',
  };

  it('generates the correct set of files', () => {
    const files = service.generate(baseParams);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('README.md');
    expect(paths).toContain('Dockerfile');
    expect(paths).toContain('.dockerignore');
    expect(paths).toContain('.github/CODEOWNERS');
    expect(paths).toContain('.github/pull_request_template.md');
    expect(paths).toContain('.github/ISSUE_TEMPLATE/bug_report.md');
    expect(paths).toContain('.github/ISSUE_TEMPLATE/feature_request.md');
    expect(paths).toContain('.github/workflows/ci.yml');
    expect(paths).toContain('kubernetes/deployment.yaml');
    expect(paths).toContain('kubernetes/service.yaml');
    expect(paths).toContain('kubernetes/hpa.yaml');
  });

  it('README contains service name and owner email', () => {
    const files = service.generate(baseParams);
    const readme = files.find((f) => f.path === 'README.md');
    expect(readme).toBeDefined();
    expect(readme?.content).toContain('my-api');
    expect(readme?.content).toContain('dev@example.com');
  });

  it('CODEOWNERS contains GitHub owner', () => {
    const files = service.generate(baseParams);
    const codeowners = files.find((f) => f.path === '.github/CODEOWNERS');
    expect(codeowners).toBeDefined();
    expect(codeowners?.content).toContain('@test-org');
  });

  it('generates Go Dockerfile for GO service type', () => {
    const files = service.generate({ ...baseParams, serviceType: 'GO' });
    const dockerfile = files.find((f) => f.path === 'Dockerfile');
    expect(dockerfile).toBeDefined();
    expect(dockerfile?.content).toContain('golang');
    expect(dockerfile?.content).toContain('scratch');
  });

  it('generates Python Dockerfile for FASTAPI service type', () => {
    const files = service.generate({ ...baseParams, serviceType: 'FASTAPI' });
    const dockerfile = files.find((f) => f.path === 'Dockerfile');
    expect(dockerfile).toBeDefined();
    expect(dockerfile?.content).toContain('python');
    expect(dockerfile?.content).toContain('uvicorn');
  });

  it('generates Java Dockerfile for SPRING_BOOT service type', () => {
    const files = service.generate({ ...baseParams, serviceType: 'SPRING_BOOT' });
    const dockerfile = files.find((f) => f.path === 'Dockerfile');
    expect(dockerfile).toBeDefined();
    expect(dockerfile?.content).toContain('eclipse-temurin');
  });

  it('kubernetes deployment references service name in namespace', () => {
    const files = service.generate(baseParams);
    const deployment = files.find((f) => f.path === 'kubernetes/deployment.yaml');
    expect(deployment).toBeDefined();
    expect(deployment?.content).toContain('dev-my-api');
    expect(deployment?.content).toContain('name: my-api');
  });

  it('all file contents are non-empty strings', () => {
    const files = service.generate(baseParams);
    files.forEach((f) => {
      expect(typeof f.content).toBe('string');
      expect(f.content.length).toBeGreaterThan(0);
    });
  });
});