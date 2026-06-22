import { TemplateFile, GenerationParams } from '../../../domain/entities/template.entity';

export function generateNodejs(p: GenerationParams): TemplateFile[] {
  const name = p.serviceName;
  const port = p.port;

  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name,
        version: '0.1.0',
        description: p.description,
        main: 'dist/index.js',
        scripts: {
          dev: 'ts-node-dev --respawn src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
          lint: 'eslint "src/**/*.ts"',
          test: 'jest',
          'test:cov': 'jest --coverage',
        },
        dependencies: {
          express: '^4.21.0',
          helmet: '^7.2.0',
          'express-rate-limit': '^7.4.1',
          'prom-client': '^15.1.3',
          winston: '^3.14.2',
          'express-winston': '^4.2.0',
          cors: '^2.8.5',
          dotenv: '^16.4.5',
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/cors': '^2.8.17',
          '@types/node': '^20.14.15',
          '@types/jest': '^29.5.12',
          typescript: '^5.5.4',
          'ts-node-dev': '^2.0.0',
          jest: '^29.7.0',
          'ts-jest': '^29.2.5',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*.ts'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
    },
    {
      path: '.env.example',
      content: `NODE_ENV=development\nPORT=${port}\nLOG_LEVEL=info\n`,
    },
    {
      path: 'src/index.ts',
      content: `import 'dotenv/config';
import { createApp } from './app';

const PORT = Number(process.env.PORT ?? ${port});

const app = createApp();

app.listen(PORT, () => {
  console.log(JSON.stringify({ level: 'info', message: '${name} started', port: PORT, env: process.env.NODE_ENV }));
});

process.on('SIGTERM', () => {
  console.log(JSON.stringify({ level: 'info', message: 'SIGTERM received, shutting down' }));
  process.exit(0);
});
`,
    },
    {
      path: 'src/app.ts',
      content: `import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health';
import { metricsRouter } from './routes/metrics';
import { requestLogger } from './middleware/logger';

export function createApp(): Application {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

  // Logging
  app.use(requestLogger);

  // Parsing
  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.use('/health', healthRouter);
  app.use('/metrics', metricsRouter);

  // 404 handler
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}
`,
    },
    {
      path: 'src/routes/health.ts',
      content: `import { Router, Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

/**
 * Liveness probe — the process is running.
 * Kubernetes restarts the pod if this fails.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: '${name}', timestamp: new Date().toISOString() });
});

/**
 * Readiness probe — the service can accept traffic.
 * Kubernetes removes the pod from load balancing if this fails.
 */
healthRouter.get('/ready', (_req: Request, res: Response) => {
  const uptimeMs = Date.now() - startTime;
  res.json({
    status: 'READY',
    service: '${name}',
    uptimeMs,
    timestamp: new Date().toISOString(),
  });
});
`,
    },
    {
      path: 'src/routes/metrics.ts',
      content: `import { Router, Request, Response } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

collectDefaultMetrics({ prefix: '${name.replace(/-/g, '_')}_' });

export const httpRequestsTotal = new Counter({
  name: '${name.replace(/-/g, '_')}_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationMs = new Histogram({
  name: '${name.replace(/-/g, '_')}_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
});

export const metricsRouter = Router();

metricsRouter.get('/', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
`,
    },
    {
      path: 'src/middleware/logger.ts',
      content: `import { Request, Response, NextFunction } from 'express';
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [new transports.Console()],
});

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const correlationId = (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      correlationId,
    });
  });

  next();
}
`,
    },
    {
      path: 'README.md',
      content: `# ${name}

${p.description || `${name} service`}

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** Express + TypeScript
- **Metrics:** Prometheus (prom-client)
- **Logging:** Winston (JSON structured)
- **Security:** Helmet, CORS, Rate Limiting

## Getting Started

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Endpoints

| Endpoint | Description |
|---|---|
| \`GET /health\` | Liveness probe |
| \`GET /health/ready\` | Readiness probe |
| \`GET /metrics\` | Prometheus metrics |

## Build & Run

\`\`\`bash
npm run build
npm start
\`\`\`

## Docker

\`\`\`bash
docker build -t ${name} .
docker run -p ${port}:${port} ${name}
\`\`\`

## Generated by IDP Platform Template Engine
`,
    },
    {
      path: 'Dockerfile',
      content: `# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:20-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./
USER app
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:${port}/health || exit 1
CMD ["node", "dist/index.js"]
`,
    },
    {
      path: '.dockerignore',
      content: `node_modules/\ndist/\ncoverage/\n.env\n.git/\n*.spec.ts\n`,
    },
    {
      path: '.github/workflows/ci.yml',
      content: `name: CI

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
      - run: npm run test:cov
      - run: npm run build
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${name}:\${{ github.sha }}
`,
    },
    {
      path: 'kubernetes/deployment.yaml',
      content: generateK8sDeployment(name, port, 'node:20-alpine'),
    },
    { path: 'kubernetes/service.yaml', content: generateK8sService(name, port) },
    { path: 'kubernetes/configmap.yaml', content: generateK8sConfigMap(name) },
    { path: 'kubernetes/hpa.yaml', content: generateK8sHpa(name) },
  ];
}

function generateK8sDeployment(name: string, port: number, _base: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: dev-${name}
  labels:
    app: ${name}
    managed-by: idp-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/metrics"
        prometheus.io/port: "${port}"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: ${name}
          image: REGISTRY/${name}:latest
          ports:
            - containerPort: ${port}
          envFrom:
            - configMapRef:
                name: ${name}-config
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health/ready
              port: ${port}
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
            capabilities:
              drop: [ALL]
`;
}

function generateK8sService(name: string, port: number): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: dev-${name}
  labels:
    app: ${name}
    managed-by: idp-platform
spec:
  selector:
    app: ${name}
  ports:
    - name: http
      port: 80
      targetPort: ${port}
  type: ClusterIP
`;
}

function generateK8sConfigMap(name: string): string {
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
  namespace: dev-${name}
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
`;
}

function generateK8sHpa(name: string): string {
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}
  namespace: dev-${name}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: 1
  maxReplicas: 10
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
`;
}