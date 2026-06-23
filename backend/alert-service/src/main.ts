import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AlertModule } from './alert.module';
import { GlobalExceptionFilter } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AlertModule);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP Platform — Alerting Service')
      .setDescription('Alerting orchestration API (Phase 6 — coming soon)')
      .setVersion('0.1.0').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  console.log(`alert-service listening on port ${port}`);
}

bootstrap().catch((err) => { console.error('Failed to start alert-service:', err); process.exit(1); });