import { Injectable } from '@nestjs/common';
import { Template, TemplateMetadata, GenerationParams, TemplateFile } from '../../domain/entities/template.entity';
import { TemplateType } from '../../domain/enums/template-type.enum';
import { TemplateNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { generateNodejs } from './generators/nodejs-generator';
import { generateFastapi } from './generators/fastapi-generator';
import { generateGo } from './generators/go-generator';
import { generateSpringBoot } from './generators/spring-boot-generator';

const TEMPLATE_METADATA: Record<TemplateType, TemplateMetadata> = {
  [TemplateType.NODEJS]: {
    type: TemplateType.NODEJS,
    name: 'Node.js + TypeScript',
    description: 'Express.js REST API with TypeScript, Prometheus metrics, Winston logging, Helmet security headers and rate limiting.',
    language: 'TypeScript',
    framework: 'Express.js',
    version: '20 LTS',
    features: ['Health endpoints', 'Prometheus metrics', 'JSON structured logging', 'Helmet security', 'Rate limiting', 'CORS', 'GitHub Actions CI', 'Kubernetes manifests', 'HPA', 'Multi-stage Dockerfile'],
    includedFiles: ['package.json', 'tsconfig.json', 'src/index.ts', 'src/app.ts', 'src/routes/health.ts', 'src/routes/metrics.ts', 'src/middleware/logger.ts', '.env.example', 'Dockerfile', '.dockerignore', '.github/workflows/ci.yml', 'kubernetes/deployment.yaml', 'kubernetes/service.yaml', 'kubernetes/configmap.yaml', 'kubernetes/hpa.yaml', 'README.md'],
  },
  [TemplateType.FASTAPI]: {
    type: TemplateType.FASTAPI,
    name: 'Python + FastAPI',
    description: 'FastAPI REST service with automatic OpenAPI docs, Prometheus instrumentation, pydantic-settings config and structured JSON logging.',
    language: 'Python',
    framework: 'FastAPI',
    version: '3.11',
    features: ['Health endpoints', 'Auto OpenAPI/Swagger docs', 'Prometheus metrics', 'JSON structured logging', 'Security headers middleware', 'CORS', 'pydantic-settings config', 'GitHub Actions CI', 'Kubernetes manifests', 'Multi-stage Dockerfile'],
    includedFiles: ['main.py', 'app/__init__.py', 'app/config.py', 'app/health.py', 'app/metrics.py', 'app/middleware.py', 'requirements.txt', 'requirements-dev.txt', '.env.example', 'Dockerfile', '.dockerignore', '.github/workflows/ci.yml', 'kubernetes/deployment.yaml', 'kubernetes/service.yaml', 'kubernetes/hpa.yaml', 'README.md'],
  },
  [TemplateType.GO]: {
    type: TemplateType.GO,
    name: 'Go',
    description: 'Go service using standard library net/http with Prometheus metrics, slog structured logging and a minimal scratch-based production image.',
    language: 'Go',
    framework: 'net/http (stdlib)',
    version: '1.22',
    features: ['Health endpoints', 'Prometheus metrics', 'slog structured logging', 'Security headers middleware', 'Request ID propagation', 'Makefile', 'Scratch-based Dockerfile', 'GitHub Actions CI', 'Kubernetes manifests'],
    includedFiles: ['go.mod', 'cmd/<name>/main.go', 'internal/server/server.go', 'internal/health/health.go', 'internal/middleware/middleware.go', '.env.example', 'Makefile', 'Dockerfile', '.dockerignore', '.github/workflows/ci.yml', 'kubernetes/deployment.yaml', 'kubernetes/service.yaml', 'kubernetes/hpa.yaml', 'README.md'],
  },
  [TemplateType.SPRING_BOOT]: {
    type: TemplateType.SPRING_BOOT,
    name: 'Java + Spring Boot',
    description: 'Spring Boot 3 REST service with Actuator health/metrics, Micrometer Prometheus, springdoc-openapi Swagger UI and Spring Security defaults.',
    language: 'Java',
    framework: 'Spring Boot 3',
    version: '21 LTS',
    features: ['Health endpoints via Actuator', 'Prometheus metrics (Micrometer)', 'Swagger UI (springdoc-openapi)', 'Spring Security', 'JSON logging (Logback)', 'Graceful shutdown', 'GitHub Actions CI', 'Kubernetes manifests', 'Multi-stage Dockerfile'],
    includedFiles: ['pom.xml', 'src/main/java/.../Application.java', 'src/main/java/.../controller/HealthController.java', 'src/main/java/.../config/SecurityConfig.java', 'src/main/resources/application.yml', '.env.example', 'Dockerfile', '.dockerignore', '.github/workflows/ci.yml', 'kubernetes/deployment.yaml', 'kubernetes/service.yaml', 'kubernetes/hpa.yaml', 'README.md'],
  },
};

const GENERATORS: Record<TemplateType, (params: GenerationParams) => TemplateFile[]> = {
  [TemplateType.NODEJS]: generateNodejs,
  [TemplateType.FASTAPI]: generateFastapi,
  [TemplateType.GO]: generateGo,
  [TemplateType.SPRING_BOOT]: generateSpringBoot,
};

@Injectable()
export class TemplateRegistryService {
  private readonly templates: Map<TemplateType, Template>;

  constructor() {
    this.templates = new Map(
      Object.values(TemplateType).map((type) => [
        type,
        new Template(TEMPLATE_METADATA[type], GENERATORS[type]),
      ]),
    );
  }

  listAll(): Template[] {
    return Array.from(this.templates.values());
  }

  findByType(type: string): Template {
    const enumType = type as TemplateType;
    const template = this.templates.get(enumType);
    if (!template) throw new TemplateNotFoundError(type);
    return template;
  }
}