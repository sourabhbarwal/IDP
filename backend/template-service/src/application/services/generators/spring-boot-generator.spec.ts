import { generateSpringBoot } from './spring-boot-generator';
import { GenerationParams } from '../../../domain/entities/template.entity';

const params: GenerationParams = {
  serviceName: 'user-service',
  description: 'User management service',
  port: 8080,
  packageName: 'com.myorg',
  author: 'Dev',
  authorEmail: 'dev@example.com',
};

describe('generateSpringBoot', () => {
  it('generates all required files', () => {
    const paths = generateSpringBoot(params).map((f) => f.path);
    expect(paths).toContain('pom.xml');
    expect(paths.some((p) => p.endsWith('Application.java'))).toBe(true);
    expect(paths.some((p) => p.endsWith('HealthController.java'))).toBe(true);
    expect(paths.some((p) => p.endsWith('SecurityConfig.java'))).toBe(true);
    expect(paths).toContain('src/main/resources/application.yml');
    expect(paths).toContain('Dockerfile');
    expect(paths).toContain('.github/workflows/ci.yml');
  });

  it('pom.xml includes service name as artifactId', () => {
    const files = generateSpringBoot(params);
    const pom = files.find((f) => f.path === 'pom.xml')!;
    expect(pom.content).toContain('user-service');
  });

  it('Application class has PascalCase name', () => {
    const files = generateSpringBoot(params);
    const appFile = files.find((f) => f.path.endsWith('Application.java'))!;
    expect(appFile.content).toContain('UserServiceApplication');
  });

  it('HealthController has liveness and readiness mappings', () => {
    const files = generateSpringBoot(params);
    const health = files.find((f) => f.path.endsWith('HealthController.java'))!;
    expect(health.content).toContain('/health');
    expect(health.content).toContain('/ready');
  });

  it('application.yml uses Prometheus actuator endpoint', () => {
    const files = generateSpringBoot(params);
    const yml = files.find((f) => f.path === 'src/main/resources/application.yml')!;
    expect(yml.content).toContain('prometheus');
  });

  it('Dockerfile uses temurin base and non-root user', () => {
    const files = generateSpringBoot(params);
    const dockerfile = files.find((f) => f.path === 'Dockerfile')!;
    expect(dockerfile.content).toContain('eclipse-temurin');
    expect(dockerfile.content).toContain('adduser');
  });

  it('handles empty package name and empty description', () => {
    const files = generateSpringBoot({
      ...params,
      packageName: '',
      description: '',
    });
    expect(files.length).toBeGreaterThan(0);
  });
});