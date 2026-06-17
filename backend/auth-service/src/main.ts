import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from './auth.module';
import { GlobalExceptionFilter } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AuthModule, {
    // Structured JSON logging — feeds into the OpenTelemetry/Loki pipeline (Phase 7)
    logger: ['error', 'warn', 'log'],
  });

  // ── Security Headers ─────────────────────────────────────────────────────────
  // Full security hardening (Helmet, rate limiting, CORS policy) is added in
  // Phase 10. For now we apply basic global validation and keep the app usable
  // during local development.
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  // ── Global Validation Pipe ───────────────────────────────────────────────────
  // class-validator rules on all DTOs; strips unknown properties (whitelist)
  // so clients cannot inject unexpected fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ──────────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── OpenAPI / Swagger ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP Platform — Auth Service')
      .setDescription('Identity, Authentication, RBAC and Audit API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Health endpoint (Kubernetes liveness / readiness probe target) ────────────
  // Full health checks (DB connectivity) are added via @nestjs/terminus in Phase 6.
  // For now the /health path is handled by the actuator-style controller below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.getHttpAdapter().get('/health', (req: any, res: any) => {
    res.status(200).send({ status: 'UP' });
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`auth-service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start auth-service:', err);
  process.exit(1);
});
