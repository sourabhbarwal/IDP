import { TemplateFile, GenerationParams } from '../../../domain/entities/template.entity';

export function generateFastapi(p: GenerationParams): TemplateFile[] {
  const name = p.serviceName;
  const port = p.port;

  return [
    {
      path: 'main.py',
      content: `"""${name} - ${p.description}"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.health import router as health_router
from app.metrics import router as metrics_router, instrumentator
from app.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup and shutdown lifecycle."""
    print(f"Starting {settings.service_name}...")
    yield
    print(f"Shutting down {settings.service_name}...")


app = FastAPI(
    title="${name}",
    description="${p.description}",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

# Middleware (applied in reverse order)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus instrumentation
instrumentator.instrument(app).expose(app, endpoint="/metrics")

# Routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(metrics_router, tags=["metrics"])
`,
    },
    {
      path: 'app/__init__.py',
      content: '',
    },
    {
      path: 'app/config.py',
      content: `from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    service_name: str = "${name}"
    environment: str = "development"
    port: int = ${port}
    log_level: str = "INFO"
    allowed_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
`,
    },
    {
      path: 'app/health.py',
      content: `import time
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
_start_time = time.time()


class HealthResponse(BaseModel):
    status: str
    service: str
    uptime_seconds: float


@router.get("/", response_model=HealthResponse, summary="Liveness probe")
async def liveness():
    """Kubernetes liveness probe — service is running."""
    return HealthResponse(
        status="UP",
        service="${name}",
        uptime_seconds=round(time.time() - _start_time, 2),
    )


@router.get("/ready", response_model=HealthResponse, summary="Readiness probe")
async def readiness():
    """Kubernetes readiness probe — service can accept traffic."""
    return HealthResponse(
        status="READY",
        service="${name}",
        uptime_seconds=round(time.time() - _start_time, 2),
    )
`,
    },
    {
      path: 'app/metrics.py',
      content: `from fastapi import APIRouter
from prometheus_fastapi_instrumentator import Instrumentator

router = APIRouter()
instrumentator = Instrumentator(
    should_group_status_codes=True,
    excluded_handlers=["/metrics", "/health"],
)
`,
    },
    {
      path: 'app/middleware.py',
      content: `import time
import logging
import json
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
)
logger = logging.getLogger("${name}")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get("x-correlation-id", str(uuid.uuid4()))
        start = time.time()

        response = await call_next(request)
        response.headers["x-correlation-id"] = correlation_id

        logger.info(json.dumps({
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.time() - start) * 1000, 2),
            "correlation_id": correlation_id,
        }))

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        return response
`,
    },
    {
      path: 'requirements.txt',
      content: `fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
pydantic-settings==2.5.2
prometheus-fastapi-instrumentator==7.0.0
`,
    },
    {
      path: 'requirements-dev.txt',
      content: `-r requirements.txt
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
ruff==0.6.9
`,
    },
    {
      path: '.env.example',
      content: `ENVIRONMENT=development\nPORT=${port}\nLOG_LEVEL=INFO\nALLOWED_ORIGINS=["http://localhost:3000"]\n`,
    },
    {
      path: 'README.md',
      content: `# ${name}

${p.description || `${name} service`}

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **Metrics:** Prometheus (prometheus-fastapi-instrumentator)
- **Logging:** Structured JSON via middleware
- **Config:** pydantic-settings

## Getting Started

\`\`\`bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port ${port}
\`\`\`

## Endpoints

| Endpoint | Description |
|---|---|
| \`GET /health\` | Liveness probe |
| \`GET /health/ready\` | Readiness probe |
| \`GET /metrics\` | Prometheus metrics |
| \`GET /api/docs\` | Swagger UI (non-prod) |

## Generated by IDP Platform Template Engine
`,
    },
    {
      path: 'Dockerfile',
      content: `# Stage 1: Build dependencies
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim AS production
RUN addgroup --system app && adduser --system --group app
WORKDIR /app
COPY --from=builder /root/.local /home/app/.local
COPY --chown=app:app . .
USER app
ENV PATH=/home/app/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]
`,
    },
    { path: '.dockerignore', content: `.venv/\n__pycache__/\n*.pyc\n.env\n.git/\ncoverage/\n` },
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
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check .
      - run: pytest --cov --cov-report=xml
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${name}:\${{ github.sha }}
`,
    },
    { path: 'kubernetes/deployment.yaml', content: generateK8sDeploymentPy(name, port) },
    { path: 'kubernetes/service.yaml', content: generateK8sServiceBase(name, port) },
    { path: 'kubernetes/hpa.yaml', content: generateK8sHpaBase(name) },
  ];
}

function generateK8sDeploymentPy(name: string, port: number): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: dev-${name}
  labels:
    app: ${name}
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
      containers:
        - name: ${name}
          image: REGISTRY/${name}:latest
          ports:
            - containerPort: ${port}
          env:
            - name: ENVIRONMENT
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: ${port}
            initialDelaySeconds: 5
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            allowPrivilegeEscalation: false
`;
}

function generateK8sServiceBase(name: string, port: number): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: dev-${name}
spec:
  selector:
    app: ${name}
  ports:
    - port: 80
      targetPort: ${port}
  type: ClusterIP
`;
}

function generateK8sHpaBase(name: string): string {
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
`;
}