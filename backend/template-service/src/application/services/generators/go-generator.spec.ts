import { generateGo } from './go-generator';
import { GenerationParams } from '../../../domain/entities/template.entity';

const params: GenerationParams = {
  serviceName: 'order-service',
  description: 'Order processing service',
  port: 8080,
  packageName: 'github.com/myorg/order-service',
  author: 'Dev',
  authorEmail: 'dev@example.com',
};

describe('generateGo', () => {
  it('generates all required files', () => {
    const paths = generateGo(params).map((f) => f.path);
    expect(paths).toContain('go.mod');
    expect(paths).toContain('cmd/order-service/main.go');
    expect(paths).toContain('internal/server/server.go');
    expect(paths).toContain('internal/health/health.go');
    expect(paths).toContain('internal/middleware/middleware.go');
    expect(paths).toContain('Makefile');
    expect(paths).toContain('Dockerfile');
  });

  it('go.mod uses the correct module name', () => {
    const files = generateGo(params);
    const goMod = files.find((f) => f.path === 'go.mod')!;
    expect(goMod.content).toContain('github.com/myorg/order-service');
  });

  it('main.go includes service name', () => {
    const files = generateGo(params);
    const main = files.find((f) => f.path === 'cmd/order-service/main.go')!;
    expect(main.content).toContain('order-service');
  });

  it('Dockerfile uses scratch base image for production', () => {
    const files = generateGo(params);
    const dockerfile = files.find((f) => f.path === 'Dockerfile')!;
    expect(dockerfile.content).toContain('scratch');
    expect(dockerfile.content).toContain('golang:1.22');
  });

  it('health handler exports liveness and readiness', () => {
    const files = generateGo(params);
    const health = files.find((f) => f.path === 'internal/health/health.go')!;
    expect(health.content).toContain('LivenessHandler');
    expect(health.content).toContain('ReadinessHandler');
  });

  it('handles empty package name and empty description', () => {
    const files = generateGo({
      ...params,
      packageName: '',
      description: '',
    });
    expect(files.length).toBeGreaterThan(0);
  });
});