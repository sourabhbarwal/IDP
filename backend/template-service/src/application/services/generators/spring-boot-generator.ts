import { TemplateFile, GenerationParams } from '../../../domain/entities/template.entity';

export function generateSpringBoot(p: GenerationParams): TemplateFile[] {
  const name = p.serviceName;
  const port = p.port;
  const pkg = p.packageName || 'com.example';
  const className = toPascalCase(name);
  const pkgPath = pkg.replace(/\./g, '/');

  return [
    {
      path: 'pom.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>${name}</artifactId>
    <version>3.3.4</version>
    <relativePath/>
  </parent>
  <groupId>${pkg}</groupId>
  <artifactId>${name}</artifactId>
  <version>0.1.0</version>
  <packaging>jar</packaging>
  <name>${name}</name>
  <description>${p.description}</description>

  <properties>
    <java.version>21</java.version>
    <springdoc.version>2.6.0</springdoc.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>io.micrometer</groupId>
      <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>\${springdoc.version}</version>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <finalName>${name}</finalName>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
      <plugin>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <version>0.8.12</version>
        <executions>
          <execution><goals><goal>prepare-agent</goal></goals></execution>
          <execution><id>report</id><phase>test</phase><goals><goal>report</goal></goals></execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
`,
    },
    {
      path: `src/main/java/${pkgPath}/${name.replace(/-/g, '')}/${className}Application.java`,
      content: `package ${pkg}.${name.replace(/-/g, '')};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className}Application {
  public static void main(String[] args) {
    SpringApplication.run(${className}Application.class, args);
  }
}
`,
    },
    {
      path: `src/main/java/${pkgPath}/${name.replace(/-/g, '')}/controller/HealthController.java`,
      content: `package ${pkg}.${name.replace(/-/g, '')}.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@Tag(name = "Health", description = "Kubernetes probe endpoints")
@RestController
@RequestMapping("/health")
public class HealthController {

  private final Instant startTime = Instant.now();

  @Operation(summary = "Liveness probe")
  @GetMapping
  public ResponseEntity<Map<String, Object>> liveness() {
    return ResponseEntity.ok(Map.of(
        "status", "UP",
        "service", "${name}",
        "timestamp", Instant.now().toString()
    ));
  }

  @Operation(summary = "Readiness probe")
  @GetMapping("/ready")
  public ResponseEntity<Map<String, Object>> readiness() {
    return ResponseEntity.ok(Map.of(
        "status", "READY",
        "service", "${name}",
        "uptimeSeconds", java.time.Duration.between(startTime, Instant.now()).toSeconds(),
        "timestamp", Instant.now().toString()
    ));
  }
}
`,
    },
    {
      path: `src/main/java/${pkgPath}/${name.replace(/-/g, '')}/config/SecurityConfig.java`,
      content: `package ${pkg}.${name.replace(/-/g, '')}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(AbstractHttpConfigurer::disable)
        .headers(headers -> headers
            .contentTypeOptions(ct -> {})
            .frameOptions(frame -> frame.deny())
            .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
        )
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/health", "/health/**", "/actuator/prometheus", "/api/docs/**", "/v3/api-docs/**").permitAll()
            .anyRequest().authenticated()
        )
        .build();
  }
}
`,
    },
    {
      path: 'src/main/resources/application.yml',
      content: `spring:
  application:
    name: ${name}
  jackson:
    serialization:
      write-dates-as-timestamps: false

server:
  port: \${PORT:${port}}
  shutdown: graceful

management:
  endpoints:
    web:
      exposure:
        include: health, info, prometheus, metrics
  endpoint:
    health:
      show-details: always
  metrics:
    tags:
      service: ${name}
      environment: \${ENVIRONMENT:development}

springdoc:
  api-docs:
    enabled: \${SPRINGDOC_ENABLED:true}
  swagger-ui:
    path: /api/docs

logging:
  pattern:
    console: '{"timestamp":"%d{yyyy-MM-dd HH:mm:ss}","level":"%level","service":"${name}","logger":"%logger","message":"%msg"}%n'
  level:
    root: INFO
    ${pkg}: DEBUG
`,
    },
    {
      path: '.env.example',
      content: `PORT=${port}\nENVIRONMENT=development\nSPRINGDOC_ENABLED=true\n`,
    },
    {
      path: 'README.md',
      content: `# ${name}

${p.description || `${name} service`}

## Tech Stack

- **Runtime:** Java 21
- **Framework:** Spring Boot 3.3
- **Metrics:** Prometheus (Micrometer)
- **Logging:** Logback (JSON format)
- **API Docs:** springdoc-openapi (Swagger UI)
- **Security:** Spring Security

## Getting Started

\`\`\`bash
./mvnw spring-boot:run
\`\`\`

Or with environment variables:

\`\`\`bash
PORT=${port} ./mvnw spring-boot:run
\`\`\`

## Endpoints

| Endpoint | Description |
|---|---|
| \`GET /health\` | Liveness probe |
| \`GET /health/ready\` | Readiness probe |
| \`GET /actuator/prometheus\` | Prometheus metrics |
| \`GET /api/docs\` | Swagger UI |

## Build

\`\`\`bash
./mvnw clean package -DskipTests
java -jar target/${name}.jar
\`\`\`

## Generated by IDP Platform Template Engine
`,
    },
    {
      path: 'Dockerfile',
      content: `# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml ./
COPY .mvn .mvn
COPY mvnw ./
RUN ./mvnw dependency:go-offline -B
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Production
FROM eclipse-temurin:21-jre-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/target/${name}.jar app.jar
USER app
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
  CMD wget -qO- http://localhost:${port}/health || exit 1
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
`,
    },
    { path: '.dockerignore', content: `target/\n.git/\ncoverage/\n*.log\n` },
    {
      path: '.github/workflows/ci.yml',
      content: `name: CI

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
      - run: ./mvnw --batch-mode verify
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${name}:\${{ github.sha }}
`,
    },
    { path: 'kubernetes/deployment.yaml', content: generateK8sDeploymentJava(name, port) },
    { path: 'kubernetes/service.yaml', content: generateK8sServiceBase(name, port) },
    { path: 'kubernetes/hpa.yaml', content: generateK8sHpaBase(name) },
  ];
}

function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase());
}

function generateK8sDeploymentJava(name: string, port: number): string {
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
        prometheus.io/path: "/actuator/prometheus"
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
            - name: SPRINGDOC_ENABLED
              value: "false"
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 30
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health/ready
              port: ${port}
            initialDelaySeconds: 15
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
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