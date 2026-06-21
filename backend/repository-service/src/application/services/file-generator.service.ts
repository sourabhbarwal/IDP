import { Injectable } from '@nestjs/common';

export interface GeneratedFile {
  path: string;
  content: string; // raw content — will be base64-encoded before committing
}

export interface FileGenerationParams {
  serviceName: string;
  serviceType: string;
  description: string;
  owner: string;       // GitHub owner (org or user)
  ownerEmail: string;
  repoFullName: string;
}

/**
 * Generates the initial set of files for a newly provisioned repository.
 * Each file is specific to the service type (NODEJS, SPRING_BOOT, FASTAPI, GO).
 */
@Injectable()
export class FileGeneratorService {
  generate(params: FileGenerationParams): GeneratedFile[] {
    const files: GeneratedFile[] = [
      this.readme(params),
      this.dockerfile(params),
      this.dockerignore(params),
      this.codeowners(params),
      this.prTemplate(),
      this.bugReportTemplate(),
      this.featureRequestTemplate(),
      this.ciWorkflow(params),
      this.k8sDeployment(params),
      this.k8sService(params),
      this.k8sHpa(params),
    ];

    return files;
  }

  private readme(p: FileGenerationParams): GeneratedFile {
    return {
      path: 'README.md',
      content: `# ${p.serviceName}

${p.description || `${p.serviceName} service`}

## Tech Stack

- **Type:** ${p.serviceType.replace('_', ' ')}
- **Repository:** \`${p.repoFullName}\`

## Getting Started

### Prerequisites

${this.prerequisites(p.serviceType)}

### Run Locally

\`\`\`bash
${this.runInstructions(p.serviceType, p.serviceName)}
\`\`\`

### Health Check

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

## Deployment

This service is managed by the IDP Platform. Deployments are triggered via the
platform portal or by pushing to the \`main\` branch which runs the CI pipeline.

### Environments

| Environment | Namespace |
|---|---|
| Development | \`dev-${p.serviceName}\` |
| Staging | \`staging-${p.serviceName}\` |
| Production | \`prod-${p.serviceName}\` |

## CI/CD

See [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Owner

- **Maintainer:** ${p.ownerEmail}
- **Team:** Defined in [.github/CODEOWNERS](.github/CODEOWNERS)
`,
    };
  }

  private prerequisites(type: string): string {
    const map: Record<string, string> = {
      NODEJS: '- Node.js 20+\n- npm 10+',
      SPRING_BOOT: '- Java 21+\n- Maven 3.9+',
      FASTAPI: '- Python 3.11+\n- pip',
      GO: '- Go 1.22+',
      OTHER: '- See project documentation',
    };
    return map[type] ?? map['OTHER'];
  }

  private runInstructions(type: string, name: string): string {
    const map: Record<string, string> = {
      NODEJS: `npm install\nnpm run dev`,
      SPRING_BOOT: `mvn spring-boot:run`,
      FASTAPI: `pip install -r requirements.txt\nuvicorn main:app --reload --port 3000`,
      GO: `go mod download\ngo run ./cmd/${name}/main.go`,
      OTHER: `# See project-specific instructions`,
    };
    return map[type] ?? map['OTHER'];
  }

  private dockerfile(p: FileGenerationParams): GeneratedFile {
    const templates: Record<string, string> = {
      NODEJS: `# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Production
FROM node:20-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/index.js"]
`,
      SPRING_BOOT: `# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: Production
FROM eclipse-temurin:21-jre-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/target/*.jar app.jar
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \\
  CMD wget -qO- http://localhost:3000/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
`,
      FASTAPI: `# Stage 1: Build
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim AS production
RUN addgroup --system app && adduser --system --group app
WORKDIR /app
COPY --from=builder /root/.local /home/app/.local
COPY --chown=app:app . .
USER app
ENV PATH=/home/app/.local/bin:$PATH
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/health')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
`,
      GO: `# Stage 1: Build
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/${p.serviceName}/main.go

# Stage 2: Production
FROM scratch AS production
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD ["/server", "-health"]
ENTRYPOINT ["/server"]
`,
    };
    return {
      path: 'Dockerfile',
      content: templates[p.serviceType] ?? templates['NODEJS'],
    };
  }

  private dockerignore(_p: FileGenerationParams): GeneratedFile {
    return {
      path: '.dockerignore',
      content: `node_modules/
.git/
.github/
dist/
build/
coverage/
*.test.*
*.spec.*
.env
.env.*
!.env.example
README.md
`,
    };
  }

  private codeowners(p: FileGenerationParams): GeneratedFile {
    return {
      path: '.github/CODEOWNERS',
      content: `# Global code owners — all PRs require review from at least one of these.
# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

* @${p.owner}
`,
    };
  }

  private prTemplate(): GeneratedFile {
    return {
      path: '.github/pull_request_template.md',
      content: `## Summary

<!-- What does this PR do? Why is it needed? -->

## Changes

<!-- List the main changes made -->

- 

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Tested locally with Docker

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-reviewed the diff
- [ ] No secrets or credentials committed
- [ ] Documentation updated if needed

## Related Issues

<!-- Link to issue(s): Closes #123 -->
`,
    };
  }

  private bugReportTemplate(): GeneratedFile {
    return {
      path: '.github/ISSUE_TEMPLATE/bug_report.md',
      content: `---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Describe the bug

A clear description of what the bug is.

## To Reproduce

Steps to reproduce:
1. 
2. 
3. 

## Expected behavior

What you expected to happen.

## Actual behavior

What actually happened.

## Environment

- Service version:
- Environment (dev/staging/prod):
- Relevant logs:
`,
    };
  }

  private featureRequestTemplate(): GeneratedFile {
    return {
      path: '.github/ISSUE_TEMPLATE/feature_request.md',
      content: `---
name: Feature request
about: Suggest an idea for this service
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Problem

What problem does this feature solve?

## Proposed solution

Describe the solution you'd like.

## Alternatives considered

Any alternative solutions you've considered?

## Additional context

Any other context or screenshots.
`,
    };
  }

  private ciWorkflow(p: FileGenerationParams): GeneratedFile {
    const workflows: Record<string, string> = {
      NODEJS: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-test-build:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${p.serviceName}:$\{{ github.sha }}
`,
      SPRING_BOOT: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'
      - run: mvn --batch-mode verify
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${p.serviceName}:$\{{ github.sha }}
`,
      FASTAPI: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-test-build:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check .
      - run: pytest --cov
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${p.serviceName}:$\{{ github.sha }}
`,
      GO: `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-test-build:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true
      - run: go vet ./...
      - run: go test ./... -coverprofile=coverage.out
      - run: go build ./...
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${p.serviceName}:$\{{ github.sha }}
`,
    };
    return {
      path: '.github/workflows/ci.yml',
      content: workflows[p.serviceType] ?? workflows['NODEJS'],
    };
  }

  private k8sDeployment(p: FileGenerationParams): GeneratedFile {
    return {
      path: 'kubernetes/deployment.yaml',
      content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${p.serviceName}
  namespace: dev-${p.serviceName}
  labels:
    app: ${p.serviceName}
    managed-by: idp-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${p.serviceName}
  template:
    metadata:
      labels:
        app: ${p.serviceName}
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: ${p.serviceName}
          image: REGISTRY/${p.serviceName}:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
`,
    };
  }

  private k8sService(p: FileGenerationParams): GeneratedFile {
    return {
      path: 'kubernetes/service.yaml',
      content: `apiVersion: v1
kind: Service
metadata:
  name: ${p.serviceName}
  namespace: dev-${p.serviceName}
  labels:
    app: ${p.serviceName}
    managed-by: idp-platform
spec:
  selector:
    app: ${p.serviceName}
  ports:
    - name: http
      port: 80
      targetPort: 3000
  type: ClusterIP
`,
    };
  }

  private k8sHpa(p: FileGenerationParams): GeneratedFile {
    return {
      path: 'kubernetes/hpa.yaml',
      content: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${p.serviceName}
  namespace: dev-${p.serviceName}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${p.serviceName}
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
`,
    };
  }
}