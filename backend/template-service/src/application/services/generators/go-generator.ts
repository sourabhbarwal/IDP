import { TemplateFile, GenerationParams } from '../../../domain/entities/template.entity';

export function generateGo(p: GenerationParams): TemplateFile[] {
  const name = p.serviceName;
  const port = p.port;
  const module = p.packageName || `github.com/your-org/${name}`;

  return [
    {
      path: 'go.mod',
      content: `module ${module}

go 1.22

require (
  github.com/prometheus/client_golang v1.20.4
  golang.org/x/exp v0.0.0-20240904232852-e7e105dedf7e
)
`,
    },
    {
      path: `cmd/${name}/main.go`,
      content: `package main

import (
  "context"
  "log/slog"
  "net/http"
  "os"
  "os/signal"
  "syscall"
  "time"

  "${module}/internal/server"
)

func main() {
  logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
  slog.SetDefault(logger)

  port := os.Getenv("PORT")
  if port == "" {
    port = "${port}"
  }

  srv := server.New(port, logger)

  go func() {
    slog.Info("starting ${name}", "port", port)
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
      slog.Error("server error", "error", err)
      os.Exit(1)
    }
  }()

  quit := make(chan os.Signal, 1)
  signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
  <-quit

  slog.Info("shutting down gracefully")
  ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
  defer cancel()
  if err := srv.Shutdown(ctx); err != nil {
    slog.Error("forced shutdown", "error", err)
  }
  slog.Info("server stopped")
}
`,
    },
    {
      path: 'internal/server/server.go',
      content: `package server

import (
  "log/slog"
  "net/http"
  "time"

  "${module}/internal/health"
  "${module}/internal/middleware"
  "github.com/prometheus/client_golang/prometheus/promhttp"
)

func New(port string, logger *slog.Logger) *http.Server {
  mux := http.NewServeMux()

  // Health
  mux.Handle("/health", health.LivenessHandler())
  mux.Handle("/health/ready", health.ReadinessHandler())

  // Metrics
  mux.Handle("/metrics", promhttp.Handler())

  // Apply middleware chain
  handler := middleware.Chain(
    mux,
    middleware.Logging(logger),
    middleware.SecurityHeaders(),
    middleware.RequestID(),
  )

  return &http.Server{
    Addr:         ":" + port,
    Handler:      handler,
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 15 * time.Second,
    IdleTimeout:  60 * time.Second,
  }
}
`,
    },
    {
      path: 'internal/health/health.go',
      content: `package health

import (
  "encoding/json"
  "net/http"
  "time"
)

var startTime = time.Now()

type HealthResponse struct {
  Status  string  \`json:"status"\`
  Service string  \`json:"service"\`
  Uptime  float64 \`json:"uptime_seconds"\`
}

func LivenessHandler() http.HandlerFunc {
  return func(w http.ResponseWriter, _ *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{
      Status:  "UP",
      Service: "${name}",
      Uptime:  time.Since(startTime).Seconds(),
    })
  }
}

func ReadinessHandler() http.HandlerFunc {
  return func(w http.ResponseWriter, _ *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{
      Status:  "READY",
      Service: "${name}",
      Uptime:  time.Since(startTime).Seconds(),
    })
  }
}
`,
    },
    {
      path: 'internal/middleware/middleware.go',
      content: `package middleware

import (
  "log/slog"
  "net/http"
  "time"

  "github.com/google/uuid"
)

type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
  for i := len(middlewares) - 1; i >= 0; i-- {
    h = middlewares[i](h)
  }
  return h
}

func Logging(logger *slog.Logger) Middleware {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      start := time.Now()
      rw := &responseWriter{ResponseWriter: w, status: 200}
      next.ServeHTTP(rw, r)
      logger.Info("request",
        "method", r.Method,
        "path", r.URL.Path,
        "status", rw.status,
        "duration_ms", time.Since(start).Milliseconds(),
        "correlation_id", r.Header.Get("X-Correlation-ID"),
      )
    })
  }
}

func SecurityHeaders() Middleware {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      w.Header().Set("X-Content-Type-Options", "nosniff")
      w.Header().Set("X-Frame-Options", "DENY")
      w.Header().Set("X-XSS-Protection", "1; mode=block")
      w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
      next.ServeHTTP(w, r)
    })
  }
}

func RequestID() Middleware {
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      id := r.Header.Get("X-Correlation-ID")
      if id == "" {
        id = uuid.NewString()
        r.Header.Set("X-Correlation-ID", id)
      }
      w.Header().Set("X-Correlation-ID", id)
      next.ServeHTTP(w, r)
    })
  }
}

type responseWriter struct {
  http.ResponseWriter
  status int
}

func (rw *responseWriter) WriteHeader(code int) {
  rw.status = code
  rw.ResponseWriter.WriteHeader(code)
}
`,
    },
    {
      path: '.env.example',
      content: `PORT=${port}\nLOG_LEVEL=info\nENVIRONMENT=development\n`,
    },
    {
      path: 'Makefile',
      content: `BINARY=${name}
CMD=./cmd/${name}/main.go

.PHONY: build run test lint docker-build

build:
\tgo build -o bin/$(BINARY) $(CMD)

run:
\tgo run $(CMD)

test:
\tgo test ./... -coverprofile=coverage.out
\tgo tool cover -html=coverage.out -o coverage.html

lint:
\tgo vet ./...

docker-build:
\tdocker build -t $(BINARY):latest .
`,
    },
    {
      path: 'README.md',
      content: `# ${name}

${p.description || `${name} service`}

## Tech Stack

- **Runtime:** Go 1.22
- **HTTP:** Standard library net/http
- **Metrics:** Prometheus (client_golang)
- **Logging:** log/slog (structured JSON)

## Getting Started

\`\`\`bash
go mod download
cp .env.example .env
go run ./cmd/${name}/main.go
\`\`\`

## Endpoints

| Endpoint | Description |
|---|---|
| \`GET /health\` | Liveness probe |
| \`GET /health/ready\` | Readiness probe |
| \`GET /metrics\` | Prometheus metrics |

## Build

\`\`\`bash
make build
./bin/${name}
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
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/${name}/main.go

# Stage 2: Production (distroless-like using scratch)
FROM scratch AS production
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD ["/server", "-health-check"]
ENTRYPOINT ["/server"]
`,
    },
    { path: '.dockerignore', content: `bin/\n.git/\ncoverage/\n*.out\n` },
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
          tags: ${name}:\${{ github.sha }}
`,
    },
    { path: 'kubernetes/deployment.yaml', content: generateK8sDeploymentGo(name, port) },
    { path: 'kubernetes/service.yaml', content: generateK8sServiceBase(name, port) },
    { path: 'kubernetes/hpa.yaml', content: generateK8sHpaBase(name) },
  ];
}

function generateK8sDeploymentGo(name: string, port: number): string {
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
        runAsUser: 65534
      containers:
        - name: ${name}
          image: REGISTRY/${name}:latest
          ports:
            - containerPort: ${port}
          env:
            - name: PORT
              value: "${port}"
            - name: ENVIRONMENT
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 5
          readinessProbe:
            httpGet:
              path: /health/ready
              port: ${port}
            initialDelaySeconds: 3
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "128Mi"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
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